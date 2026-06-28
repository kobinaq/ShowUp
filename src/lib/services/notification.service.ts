import { NotificationChannel, type Lecturer } from "@prisma/client";
import { Resend } from "resend";
import africastalking from "africastalking";
import { prisma } from "@/lib/prisma";

type MessageTarget = Pick<Lecturer, "id" | "firstName" | "lastName" | "email" | "phone">;

export class NotificationService {
  private resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  private sms =
    process.env.AT_API_KEY && process.env.AT_USERNAME
      ? africastalking({ apiKey: process.env.AT_API_KEY, username: process.env.AT_USERNAME }).SMS
      : null;

  async notifyLecturer(target: MessageTarget, subject: string, message: string) {
    const email = await this.sendEmail(target.email, subject, this.wrapEmail(target.firstName, message));
    const sms = await this.sendSms(target.phone, message);
    await prisma.lecturerNotification.createMany({
      data: [
        { lecturerId: target.id, channel: NotificationChannel.EMAIL, message, status: email },
        { lecturerId: target.id, channel: NotificationChannel.SMS, message, status: sms }
      ]
    });
  }

  async sendRepCredentials(realEmail: string, realPhone: string, aliasEmail: string, password: string) {
    const loginUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const message = `ShowUp reporter assigned. Login: ${loginUrl} Username: ${aliasEmail} Password: ${password}. Keep confidential.`;
    await Promise.all([
      this.sendEmail(realEmail, "ShowUp course reporter credentials", this.wrapEmail("Reporter", message)),
      this.sendSms(realPhone, message)
    ]);
  }

  async contestResolved(to: string, course: string, date: string, status: string, note: string) {
    const message = `The contest for ${course} report on ${date} has been ${status.toLowerCase()}. ${note}`;
    await this.sendEmail(to, "ShowUp contest resolved", this.wrapEmail("HOD", message));
  }

  private async sendEmail(to: string, subject: string, html: string) {
    if (!this.resend) return "skipped";
    try {
      await this.resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "ShowUp <noreply@showup.app>",
        to,
        subject,
        html
      });
      return "sent";
    } catch (error) {
      console.error(error);
      return "failed";
    }
  }

  private async sendSms(to: string, message: string) {
    if (!this.sms) return "skipped";
    try {
      await this.sms.send({ to: [to], message, from: process.env.AT_SENDER_ID });
      return "sent";
    } catch (error) {
      console.error(error);
      return "failed";
    }
  }

  private wrapEmail(name: string, message: string) {
    return `<div style="font-family:Inter,Arial,sans-serif;color:#0D1F3C"><h1 style="margin:0 0 16px">ShowUp</h1><p>Dear ${name},</p><p>${message}</p></div>`;
  }
}

export const notificationService = new NotificationService();
