import * as constants from "../utils/constants/email.constant";
import fs from "fs";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import handlebars from "handlebars";
import path from "path";
import * as utils from "../utils/utils";
import logger from "../config/logger";

const publicDir: string = path.join(__dirname, "../public/emailTemplates"); //THIS IS FOR LOCAL

// Initialize AWS SES Client
const sesClient = new SESClient({
  region: process.env.AWS_SES_REGION,
  credentials: {
    accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
  },
});

/* istanbul ignore next */
if (process.env.NODE_ENV !== "test") {
  console.log("🚀 Email service initialized");
}

const readHTMLFile = function (
  filepath: string,
  callback: (err: Error | null, html?: string) => void,
): void {
  fs.readFile(filepath, { encoding: "utf-8" }, function (err, html) {
    if (err != null) {
      callback(err);
    } else {
      callback(null, html);
    }
  });
};

const getHTMLandSendEmail = async (
  templateFile: string,
  request: Record<string, string>,
): Promise<boolean> => {
  try {
    const subject: string = "";
    const mailOptions = {
      from: `"${process.env.PROJECT_NAME}" <${process.env.AWS_SENDER_EMAIL}>`,
      to: request.email,
      subject,
      html: "",
    };

    const html = await new Promise<string>((resolve, reject) => {
      readHTMLFile(templateFile, function (err, html) {
        if (err != null) {
          logger.error({ err }, "Error reading HTML file:");
          reject(err);
        } else {
          if (html !== undefined) resolve(html);
        }
      });
    });

    const template = handlebars.compile(html);
    const {
      first_name,
      last_name,
      middle_name,
      url,
      email_verification_link,
      reset_password_link,
      email,
      password,
      otp,
    } = request;

    const replacements = {
      user_name: `${first_name} ${middle_name} ${last_name}`,
      url: url ?? "",
      email_verification_link: email_verification_link ?? "",
      reset_password_link: reset_password_link ?? "",
      email,
      password,
      otp: otp ?? "",
      //   support_email: config.email.supportEmail,
      //   project_name: config.projectName,
      //   company_url: config.logo.companyLogoUrl,
    };

    mailOptions.html = template(replacements);
    mailOptions.subject = request.subject ?? "";

    // Send email using AWS SES
    const params = {
      Source: mailOptions.from,
      Destination: {
        ToAddresses: [mailOptions.to],
      },
      Message: {
        Subject: {
          Data: mailOptions.subject,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: mailOptions.html,
            Charset: "UTF-8",
          },
        },
      },
    };

    const command = new SendEmailCommand(params);
    await sesClient.send(command);
    logger.info(
      `Email sent to ${request.email} with subject: ${mailOptions.subject}`,
    );

    return true;
  } catch (error) {
    logger.error(`Error sending email to ${request.email}: ${error}`);
    return false;
  }
};

export const sendEmail = async (
  type: string,
  request: Record<string, string>,
) => {
  try {
    switch (type) {
      case constants.USER_EMAIL_VERIFICATION_TEMPLATE:
        request.subject = constants.USER_EMAIL_VERIFICATION_SUBJECT;
        request.email_verification_link = utils.createUrl({
          type: "verify-email",
          query: `token=${request.token}`,
        });
        return await getHTMLandSendEmail(
          `${publicDir}/email-verification.html`,
          request,
        );

      case constants.USER_EMAIL_VERIFIED_TEMPLATE:
        request.subject = constants.USER_EMAIL_VERIFIED_SUBJECT;
        return await getHTMLandSendEmail(
          `${publicDir}/email-verification-success.html`,
          request,
        );

      case constants.USER_REGISTERED_TEMPLATE:
        request.subject = constants.USER_REGISTERED_SUBJECT;
        return await getHTMLandSendEmail(`${publicDir}/welcome.html`, request);

      case constants.USER_FORGOT_PASSWORD_TEMPLATE:
        request.subject = constants.USER_FORGOT_PASSWORD_SUBJECT;
        request.reset_password_link = utils.createUrl({
          type: "reset-password",
          query: `token=${request.token}`,
        });
        return await getHTMLandSendEmail(
          `${publicDir}/forgot-password.html`,
          request,
        );

      case constants.USER_RESET_PASSWORD_TEMPLATE:
        request.subject = constants.USER_RESET_PASSWORD_SUBJECT;
        return await getHTMLandSendEmail(
          `${publicDir}/reset-password-success.html`,
          request,
        );

      case constants.USER_WITH_CREDENTIALS_TEMPLATE:
        request.subject = constants.USER_WITH_CREDENTIALS_SUBJECT;
        return await getHTMLandSendEmail(
          `${publicDir}/user-with-credentials.html`,
          request,
        );

      case constants.STAFF_ACCOUNT_CREATED_TEMPLE:
        request.subject = constants.STAFF_ACCOUNT_CREATED_SUBJECT;
        return await getHTMLandSendEmail(
          `${publicDir}/staff-created.html`,
          request,
        );

      default:
        logger.warn(`Unknown email template type: ${type}`);
        return false;
    }
  } catch (error) {
    logger.error(`Error in sendMail function for type ${type}: ${error}`);
    return false;
  }
};
