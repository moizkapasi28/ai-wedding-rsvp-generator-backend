import { Group, Guest, Prisma, Side } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import {
  createGuest,
  createGuestEventInvite,
  deleteGuest,
  deleteGuestEventInvitesByEventIds,
  findAllGuests,
  findGuestByMobileNumberAndWeddingId,
  findGuestEventInvitesByGuestId,
  getGuestsConfirmationStats,
  getWeddingGuest,
  updateGuest,
} from "../repositories/guest.repository";
import { v4 as uuidv4 } from "uuid";
import { verfiyWeddingOwnershipService } from "./wedding.service";
import { ApiError } from "../utils/apiError.util";
import {
  EditWeddingGuestDto,
  AddNewGuestDto,
  addNewGuestBodySchema,
} from "../validations/guest.validations";
import { verifyWeddingEventOwnershipService } from "./event.service";
import { findGuestEventInviteFormatByEventId } from "../repositories/eventInviteFormat.repository";
import { getAllEventsByWeddingID } from "../repositories/event.repository";
import ExcelJS from "exceljs";
import { EVENT_START_COL, FIXED_COLS } from "../utils/constants/guest.constant";
import { colLetter } from "../utils/utils";
import { findWeddingById } from "../repositories/wedding.repository";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { addParseGuestListJob } from "../queues/guest.queue";
import readXlsxFile from "read-excel-file/node";
import { Job } from "bullmq";

const addValidation = (
  ws: ExcelJS.Worksheet,
  address: string,
  validation: ExcelJS.DataValidation,
) => {
  ws.getCell(address).dataValidation = validation;
};

export const getAllGuestsService = async (
  weddingId: string,
  eventId?: string,
  page: number = 1,
  limit: number = 10,
  search?: string,
  events?: string[],
  sides?: Side[],
  groups?: Group[],
) => {
  const { guests, total } = await findAllGuests(
    weddingId,
    eventId,
    page,
    limit,
    search,
    events,
    sides,
    groups,
  );

  return {
    guests,
    totalCount: total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  };
};

export const addNewGuestService = async (
  userId: string,
  body: AddNewGuestDto,
) => {
  // Verify ownership of all provided events
  const events = await Promise.all(
    body.eventIds.map(async (eventId) => {
      const event = await verifyWeddingEventOwnershipService(eventId, userId);

      if (!event) throw new ApiError(400, "Invalid Event or Event Not Found");

      return event;
    }),
  );

  // A user can own multiple weddings — ensure all events come from the same one
  // (verify Wedding Event Ownership Service only checks user → wedding ownership,
  //  not that every event shares the same wedding_id)
  const weddingIds = new Set(events.map((e) => e.wedding_id));
  if (weddingIds.size > 1)
    throw new ApiError(400, "All events must belong to the same wedding");

  const wedding_id = events[0].wedding_id;
  const eventIds = events.map((e) => e.id);

  const guestPayload: Prisma.GuestUncheckedCreateInput = {
    wedding_id,
    name: body.name,
    mobile_number: body.mobile_number,
    email: body.email,
    side: body.side,
    group: body.group,
    accomodation_required: body.accomodation_required,
    accomodation_address: body.accomodation_address,
    note: body.note,
  };

  return prisma.$transaction(async (tx) => {
    // 3. Reuse existing guest if mobile + wedding already on record
    const existingGuest = await findGuestByMobileNumberAndWeddingId(
      guestPayload.mobile_number,
      guestPayload.wedding_id,
      tx,
    );

    let guest: Guest;

    if (!existingGuest) {
      guest = await createGuest(guestPayload, tx);
      if (!guest) throw new ApiError(400, "Failed to create guest");
    } else guest = existingGuest;

    // Fetch existing invites to skip duplicates and avoid DB unique constraint errors
    const existingInvites = existingGuest
      ? await findGuestEventInvitesByGuestId(guest.id, tx)
      : [];
    const existingEventIds = new Set(
      existingInvites.map((inv) => inv.event_id),
    );

    // 4. Create an event invite for each provided event
    const guestEventInvites = await Promise.all(
      eventIds.map(async (eventId) => {
        if (existingEventIds.has(eventId)) {
          return true; // Skip if already invited
        }

        const guestEventInviteFormat =
          await findGuestEventInviteFormatByEventId(eventId, tx);

        if (!guestEventInviteFormat)
          throw new Error("Event invite format not found");

        const guestInvitePayload: Prisma.GuestEventInviteUncheckedCreateInput =
        {
          event_id: eventId,
          guest_id: guest.id,
          invite_format_id: guestEventInviteFormat.id,
          invite_token: uuidv4(),
          plus_ones: null,
          dietary: null,
          invite_deadline: null,
          responded_at: null,
        };
        return await createGuestEventInvite(guestInvitePayload, tx);
      }),
    );

    if (guestEventInvites.some((invite) => !invite))
      throw new ApiError(400, "Failed to create guest");

    return guest;
  });
};

export const getWeddingGuestService = async (
  userId: string,
  guestId: string,
) => {
  const guest = await getWeddingGuest(guestId);

  if (!guest) throw new ApiError(403, "Guest not found");

  const isWeddingOwner = await verfiyWeddingOwnershipService(
    userId,
    guest.wedding_id,
  );

  if (!isWeddingOwner) throw new ApiError(403, "Guest not found");

  return guest;
};

export const editWeddingGuestService = async (
  guestId: string,
  userId: string,
  payload: EditWeddingGuestDto["body"],
) => {
  // Verify the guest belongs to a wedding owned by the current user
  const guest = await getWeddingGuestService(userId, guestId);

  const newEventIds = payload.eventIds ?? [];

  return prisma.$transaction(async (tx) => {
    // Fetch the current event invites for this guest
    const existingInvites = await findGuestEventInvitesByGuestId(guestId, tx);
    const existingEventIds = new Set(existingInvites.map((i) => i.event_id));

    const newEventIdSet = new Set(newEventIds);

    // Determine which event IDs to add and which to remove
    const toAdd = newEventIds.filter((id) => !existingEventIds.has(id));
    const toRemove = [...existingEventIds].filter(
      (id) => !newEventIdSet.has(id),
    );

    // Verify ownership of every newly-added event before any writes
    if (toAdd.length > 0) {
      const verifiedEvents = await Promise.all(
        toAdd.map(async (eventId) => {
          const ownershipEvent = await verifyWeddingEventOwnershipService(
            eventId,
            userId,
          );

          if (!ownershipEvent)
            throw new ApiError(400, "Invalid Event or Event Not Found");

          return ownershipEvent;
        }),
      );

      // A user can own multiple weddings — ensure all new events belong
      // to the same wedding the guest is already part of
      const hasEventFromAnotherWedding = verifiedEvents.some(
        (event) => event.wedding_id !== guest.wedding_id,
      );
      if (hasEventFromAnotherWedding)
        throw new ApiError(
          400,
          "All events must belong to the guest's wedding",
        );
    }

    // 4. Delete removed invites
    if (toRemove.length > 0)
      await deleteGuestEventInvitesByEventIds(guestId, toRemove, tx);

    // 5. Create new invites
    if (toAdd.length > 0)
      await Promise.all(
        toAdd.map(async (eventId) => {
          const guestEventInviteFormat =
            await findGuestEventInviteFormatByEventId(eventId, tx);

          if (!guestEventInviteFormat)
            throw new Error("Event invite format not found");

          return await createGuestEventInvite(
            {
              event_id: eventId,
              guest_id: guestId,
              invite_format_id: guestEventInviteFormat.id,
              invite_token: uuidv4(),
              plus_ones: null,
              dietary: null,
              invite_deadline: null,
              responded_at: null,
            },
            tx,
          );
        }),
      );
    // 5. Update guest profile fields if any were provided
    const { eventIds: _eventIds, ...guestFields } = payload;
    const hasGuestUpdates = Object.keys(guestFields).length > 0;

    const updatedGuest = hasGuestUpdates
      ? await updateGuest(guestId, guestFields, tx)
      : await getWeddingGuest(guestId, tx);

    if (!updatedGuest) throw new ApiError(400, "Failed to update guest");

    return updatedGuest;
  });
};

export const deleteWeddingGuestService = async (guestId: string) => {
  const guest = await deleteGuest(guestId);

  if (!guest) throw new ApiError(403, "Failed to delete guest");
};

export const calculateConfirmationOfGuest = async (weddingId: string) => {
  const [totalInvites, confirmedInvites] =
    await getGuestsConfirmationStats(weddingId);

  const confirmationRate =
    totalInvites === 0
      ? 0
      : Number(((confirmedInvites / totalInvites) * 100).toFixed(2));

  return confirmationRate;
};

export const downloadGuestListTemplateService = async (weddingId: string) => {
  const wedding = await findWeddingById(weddingId);

  const events = await getAllEventsByWeddingID(weddingId);

  if (!events.length) {
    throw new ApiError(
      400,
      "No events found. Create at least one event before downloading the template",
    );
  }

  const wb = new ExcelJS.Workbook();
  const lastCol = colLetter(FIXED_COLS.note + events.length);

  const ws = wb.addWorksheet("Guest List", {
    views: [{ state: "frozen", xSplit: 1, ySplit: 7 }],
    properties: { tabColor: { argb: "FFC0415A" } },
  });
  ws.properties.showGridLines = false;

  const widths = [5, 26, 18, 26, 12, 14, 18, 32, 22];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  // Format mobile number column as text to allow + prefix
  ws.getColumn(FIXED_COLS.mobile_number).numFmt = "@";

  events.forEach((_, i) => {
    ws.getColumn(EVENT_START_COL + i).width = 16;
  });

  ws.mergeCells(1, 1, 1, FIXED_COLS.note + events.length);
  const titleCell = ws.getCell("A1");
  titleCell.value = `${wedding.bride_name} & ${wedding.groom_name} — Guest List`;
  titleCell.font = {
    name: "Arial",
    size: 14,
    bold: true,
    color: { argb: "FFFFFFFF" },
  };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFC0415A" },
  };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 26;

  ws.mergeCells(2, 1, 2, FIXED_COLS.note + events.length);
  const subCell = ws.getCell("A2");
  subCell.value = wedding.venue
    ? `${wedding.venue} · ${new Date(wedding.date).toLocaleDateString()}`
    : new Date(wedding.date).toLocaleDateString();
  subCell.font = {
    name: "Arial",
    size: 10,
    italic: true,
    color: { argb: "FF666666" },
  };
  subCell.alignment = { horizontal: "center" };

  ws.mergeCells(3, 1, 3, FIXED_COLS.note + events.length);
  const legendCell = ws.getCell("A3");
  legendCell.value =
    "Fill in guest details below. Use the dropdowns for Side, Group, and Accommodation. " +
    "Under each event column, type ✓ to invite that guest, or leave blank.";
  legendCell.font = { name: "Arial", size: 9, color: { argb: "FF888888" } };
  legendCell.alignment = { horizontal: "left", wrapText: true };
  ws.getRow(3).height = 18;

  ws.mergeCells(4, FIXED_COLS.serial, 4, FIXED_COLS.note);
  const guestSectionCell = ws.getCell(4, FIXED_COLS.serial);
  guestSectionCell.value = "GUEST INFORMATION";
  guestSectionCell.font = {
    name: "Arial",
    size: 10,
    bold: true,
    color: { argb: "FFFFFFFF" },
  };
  guestSectionCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF8A8A8A" },
  };
  guestSectionCell.alignment = { horizontal: "center" };

  if (events.length) {
    ws.mergeCells(4, EVENT_START_COL, 4, EVENT_START_COL + events.length - 1);
    const eventsSectionCell = ws.getCell(4, EVENT_START_COL);
    eventsSectionCell.value = "EVENTS INVITES";
    eventsSectionCell.font = {
      name: "Arial",
      size: 10,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    eventsSectionCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFC0415A" },
    };
    eventsSectionCell.alignment = { horizontal: "center" };
  }
  ws.getRow(4).height = 18;

  ws.getRow(5).height = 6;

  const FIELD_MARKERS: Record<number, string> = {
    [FIXED_COLS.serial]: "__serial__",
    [FIXED_COLS.name]: "__name__",
    [FIXED_COLS.mobile_number]: "__mobile_number__",
    [FIXED_COLS.email]: "__email__",
    [FIXED_COLS.side]: "__side__",
    [FIXED_COLS.group]: "__group__",
    [FIXED_COLS.accommodation_required]: "__accommodation_required__",
    [FIXED_COLS.accommodation_address]: "__accommodation_address__",
    [FIXED_COLS.note]: "__note__",
  };

  Object.entries(FIELD_MARKERS).forEach(([col, marker]) => {
    const cell = ws.getRow(6).getCell(Number(col));
    cell.value = marker;
    cell.font = { name: "Arial", size: 1, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFFFFF" },
    };
  });

  events.forEach((event, i) => {
    const cell = ws.getRow(6).getCell(EVENT_START_COL + i);
    cell.value = event.id; // ← the real DB id
    cell.font = { name: "Arial", size: 1, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFFFFF" },
    };
  });

  ws.getRow(6).hidden = true;

  const HEADER_ROW = 7;

  const fixedHeaders: Record<number, string> = {
    [FIXED_COLS.serial]: "#",
    [FIXED_COLS.name]: "Guest Name",
    [FIXED_COLS.mobile_number]: "Mobile Number",
    [FIXED_COLS.email]: "Email",
    [FIXED_COLS.side]: "Side",
    [FIXED_COLS.group]: "Group",
    [FIXED_COLS.accommodation_required]: "Accommodation?",
    [FIXED_COLS.accommodation_address]: "Accommodation Address",
    [FIXED_COLS.note]: "Note",
  };

  Object.entries(fixedHeaders).forEach(([col, label]) => {
    const cell = ws.getRow(HEADER_ROW).getCell(Number(col));
    cell.value = label;
    cell.font = {
      name: "Arial",
      size: 10,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF8A8A8A" },
    };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
  });

  events.forEach((event, i) => {
    const cell = ws.getRow(HEADER_ROW).getCell(EVENT_START_COL + i);
    cell.value = event.title; // ← human-readable label the user sees
    cell.font = {
      name: "Arial",
      size: 10,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFC0415A" },
    };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
  });

  ws.getRow(HEADER_ROW).height = 32;

  const totalCols = FIXED_COLS.note + events.length;
  for (let c = 1; c <= totalCols; c++) {
    ws.getRow(HEADER_ROW).getCell(c).border = {
      bottom: { style: "thin", color: { argb: "FF000000" } },
    };
  }

  const DATA_START = 8;
  const DATA_END = 1048576; // Max rows in Excel

  ws.dataValidations.add(`E${DATA_START}:E${DATA_END}`, {
    type: "list",
    formulae: ['"BRIDE,GROOM,BOTH"'],
    allowBlank: false,
    showErrorMessage: true,
    errorStyle: "stop",
    errorTitle: "Invalid Side",
    error: "Must be BRIDE, GROOM or BOTH",
  });

  ws.dataValidations.add(`F${DATA_START}:F${DATA_END}`, {
    type: "list",
    formulae: ['"FAMILY,FRIEND,RELATIVE,COLLEAGUE,EMPLOYEE,VIP,OTHER"'],
    allowBlank: false,
    showErrorMessage: true,
    errorStyle: "stop",
    errorTitle: "Invalid Group",
    error:
      "Must be FAMILY, FRIEND, RELATIVE, COLLEAGUE, EMPLOYEE, VIP or OTHER",
  });

  ws.dataValidations.add(`G${DATA_START}:G${DATA_END}`, {
    type: "list",
    formulae: ['"TRUE,FALSE"'],
    allowBlank: false,
    showErrorMessage: true,
    errorStyle: "stop",
    errorTitle: "Invalid",
    error: "Must be TRUE or FALSE",
  });

  events.forEach((_, i) => {
    const col = colLetter(EVENT_START_COL + i);
    ws.dataValidations.add(`${col}${DATA_START}:${col}${DATA_END}`, {
      type: "list",
      formulae: ['"✓,"'],
      allowBlank: true,
      showErrorMessage: true,
      errorStyle: "stop",
      errorTitle: "Invalid",
      error: "Type ✓ to invite, or leave blank",
    });
  });

  const meta = wb.addWorksheet("_meta");
  meta.state = "veryHidden";

  meta.getCell("A1").value = "weddingId";
  meta.getCell("B1").value = weddingId;
  meta.getCell("A2").value = "version";
  meta.getCell("B2").value = "2";
  meta.getCell("A3").value = "schemaVersion";
  meta.getCell("B3").value = "addNewGuestBodySchema_v1";

  const eventMapJSON = JSON.stringify(
    Object.fromEntries(
      events.map((e, i) => [colLetter(EVENT_START_COL + i), e.id]),
    ),
  );
  meta.getCell("A5").value = "eventMapJSON";
  meta.getCell("B5").value = eventMapJSON;

  meta.getCell("A6").value = "fieldColMapJSON";
  meta.getCell("B6").value = JSON.stringify({
    name: "B",
    mobile_number: "C",
    email: "D",
    side: "E",
    group: "F",
    accommodation_required: "G",
    accommodation_address: "H",
    note: "I",
  });

  const eventNameMapJSON = JSON.stringify(
    Object.fromEntries(
      events.map((e, i) => [colLetter(EVENT_START_COL + i), e.title]),
    ),
  );
  meta.getCell("A7").value = "eventNameMapJSON";
  meta.getCell("B7").value = eventNameMapJSON;

  return wb;
};

export const importGuestListTemplateService = async (
  userId: string,
  weddingId: string,
  fileBuffer: Buffer,
) => {
  const fileName = `guest-import-${uuidv4()}.xlsx`;
  const filePath = path.join(os.tmpdir(), fileName);
  await fs.writeFile(filePath, fileBuffer);

  const job = await addParseGuestListJob(userId, weddingId, filePath);

  return {
    jobId: job.id,
    message: "Import started in background. Use jobId to poll status.",
  };
};

export const parseGuestListTemplateJob = async (
  job: Job,
  userId: string,
  weddingId: string,
  filePath: string,
) => {
  try {
    await fs.access(filePath);
  } catch (err) {
    throw new Error(`Template file not found or already deleted: ${filePath}`);
  }


  let metaRows: any[][];
  try {
    metaRows = (await readXlsxFile(filePath, { sheet: '_meta' } as any)) as any;
  } catch (err) {
    throw new ApiError(400, "Invalid template file. _meta sheet missing or unreadable.");
  }

  let metaWeddingId: string | undefined;
  let eventMapStr: string | undefined;
  let fieldColMapStr: string | undefined;

  let actualMetaRows = metaRows;
  // If the library returned an array of sheet objects, extract the data array
  if (metaRows.length > 0 && metaRows[0] && !Array.isArray(metaRows[0]) && (metaRows[0] as any).data) {
    const sheetObj = metaRows.find((s: any) => s.sheet === '_meta' || s.name === '_meta') || metaRows[0];
    actualMetaRows = (sheetObj as any).data;
  }

  for (const row of actualMetaRows) {
    if (Array.isArray(row)) {
      if (row[0] === "weddingId") metaWeddingId = row[1]?.toString();
      if (row[0] === "eventMapJSON") eventMapStr = row[1]?.toString();
      if (row[0] === "fieldColMapJSON") fieldColMapStr = row[1]?.toString();
    }
  }

  if (metaWeddingId !== weddingId) {
    throw new ApiError(
      400,
      "This template belongs to a different wedding. Please download a new template for this wedding.",
    );
  }

  if (!fieldColMapStr || !eventMapStr) {
    throw new ApiError(400, "Invalid template file format.");
  }

  const fieldColMap = JSON.parse(fieldColMapStr) as Record<string, string>;
  const eventMap = JSON.parse(eventMapStr) as Record<string, string>;

  let guestRows: any[][];
  try {
    guestRows = (await readXlsxFile(filePath, { sheet: 'Guest List' } as any)) as any;
  } catch (err) {
    throw new ApiError(400, "Guest List sheet missing or unreadable.");
  }

  const results = {
    totalProcessed: 0,
    successful: 0,
    failed: 0,
    errors: [] as { row: number; error: string }[],
  };

  const seenMobiles = new Set<string>();
  const payloadsToProcess: { rowIdx: number; parsedData: any }[] = [];

  const colToIndex = (col: string) => {
    let index = 0;
    for (let j = 0; j < col.length; j++) {
      index = index * 26 + (col.toUpperCase().charCodeAt(j) - 64);
    }
    return index - 1;
  };

  let actualGuestRows = guestRows;
  if (guestRows.length > 0 && guestRows[0] && !Array.isArray(guestRows[0]) && (guestRows[0] as any).data) {
    const sheetObj = guestRows.find((s: any) => s.sheet === 'Guest List' || s.name === 'Guest List') || guestRows[1] || guestRows[0];
    actualGuestRows = (sheetObj as any).data;
  }

  // Start at index 7 (Row 8 in Excel)
  for (let i = 7; i < actualGuestRows.length; i++) {
    const row = actualGuestRows[i];
    if (!Array.isArray(row)) continue;
    const rowNumber = i + 1; // 1-indexed for logs

    const name = row[colToIndex(fieldColMap.name)]?.toString().trim();
    const mobile = row[colToIndex(fieldColMap.mobile_number)]?.toString().trim();

    if (!name && !mobile) {
      continue;
    }

    if (mobile) {
      if (seenMobiles.has(mobile)) {
        continue;
      }
      seenMobiles.add(mobile);
    }

    results.totalProcessed++;

    try {
      const email = row[colToIndex(fieldColMap.email)]?.toString().trim();
      const side = row[colToIndex(fieldColMap.side)]?.toString().trim();
      const group = row[colToIndex(fieldColMap.group)]?.toString().trim();

      const accReqStr = row[colToIndex(fieldColMap.accommodation_required)]
        ?.toString()
        .trim()
        .toUpperCase();
      const accomodation_required = accReqStr === "TRUE";

      let accomodation_address = row[colToIndex(fieldColMap.accommodation_address)]
        ?.toString()
        .trim();

      if (!accomodation_required) {
        accomodation_address = undefined;
      }
      const note = row[colToIndex(fieldColMap.note)]?.toString().trim();

      const eventIds: string[] = [];
      for (const [col, eventId] of Object.entries(eventMap)) {
        const val = row[colToIndex(col)]?.toString().trim();
        if (val === "✓" || val?.toLowerCase() === "true" || val === "1") {
          eventIds.push(eventId);
        }
      }

      const payload = {
        name,
        mobile_number: mobile,
        email,
        side,
        group,
        accomodation_required,
        accomodation_address,
        note,
        eventIds,
      };

      const parsedData = addNewGuestBodySchema.parse(payload);

      payloadsToProcess.push({ rowIdx: rowNumber, parsedData });
    } catch (error: any) {
      results.failed++;
      let errorMsg = error.message;

      if (error.name === "ZodError") {
        errorMsg = (error.issues || error.errors || [])
          .map((e: any) => `${e.path.join(".")}: ${e.message}`)
          .join(", ");
      } else if (error instanceof ApiError) {
        errorMsg = error.message;
      }

      results.errors.push({
        row: rowNumber,
        error: errorMsg,
      });
    }
  }

  // Process individual row jobs sequentially
  let i = 0;
  for (const { rowIdx, parsedData } of payloadsToProcess) {
    try {
      await addNewGuestService(userId, parsedData);
      results.successful++;
    } catch (error: any) {
      results.failed++;
      let errorMsg = error.message;
      if (error.name === "ZodError") {
        errorMsg = error.errors
          .map((e: any) => `${e.path.join(".")}: ${e.message}`)
          .join(", ");
      } else if (error instanceof ApiError) {
        errorMsg = error.message;
      }
      results.errors.push({
        row: rowIdx,
        error: errorMsg,
      });
    }

    i++;
    // Update progress between 10% (parsing done) and 100%
    const progress = 10 + Math.floor((i / payloadsToProcess.length) * 90);
    await job.updateProgress(progress);
  }

  return results;
};

export const exportGuestsService = async (
  weddingId: string,
  eventId?: string,
  search?: string,
  events?: string[],
  sides?: Side[],
  groups?: Group[],
) => {
  const wedding = await findWeddingById(weddingId);
  if (!wedding) throw new ApiError(404, "Wedding not found");

  const { guests } = await findAllGuests(
    weddingId,
    eventId,
    1,
    999999,
    search,
    events,
    sides,
    groups,
  );

  const weddingEvents = await getAllEventsByWeddingID(weddingId);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Guest List Export");

  const columns: any[] = [
    { header: "Name", key: "name", width: 25 },
    { header: "Mobile Number", key: "mobile_number", width: 20 },
    { header: "Email", key: "email", width: 25 },
    { header: "Side", key: "side", width: 15 },
    { header: "Group", key: "group", width: 15 },
    {
      header: "Accommodation Required",
      key: "accomodation_required",
      width: 25,
    },
    { header: "Accommodation Address", key: "accomodation_address", width: 30 },
    { header: "Note", key: "note", width: 30 },
  ];

  weddingEvents.forEach((event) => {
    columns.push({
      header: `Invite: ${event.title}`,
      key: `event_${event.id}`,
      width: 25,
    });
  });

  ws.columns = columns;

  guests.forEach((guest) => {
    const row: any = {
      name: guest.name,
      mobile_number: guest.mobile_number,
      email: guest.email,
      side: guest.side,
      group: guest.group,
      accomodation_required: guest.accomodation_required ? "Yes" : "No",
      accomodation_address: guest.accomodation_address || "",
      note: guest.note || "",
    };

    weddingEvents.forEach((event) => {
      const invite = guest.guestEventInvite.find(
        (inv: any) => inv.event.id === event.id,
      );
      row[`event_${event.id}`] = invite ? invite.status : "Not Invited";
    });

    ws.addRow(row);
  });

  ws.getRow(1).font = { bold: true };

  const buffer = await wb.xlsx.writeBuffer();
  return buffer;
};
