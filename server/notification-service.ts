import sgMail from '@sendgrid/mail';
import { Twilio } from 'twilio';

// Initialize Twilio client
let twilioClient: Twilio | null = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = new Twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
} else {
  console.warn('Twilio credentials not found, SMS functionality will not work');
}

export interface MedicationReminderData {
  recipientName: string;
  medicationName: string;
  dosage: string;
  scheduledTime: string;
  userEmail: string;
  userPhone?: string;
  userName: string;
}

export async function sendMedicationReminderEmail(data: MedicationReminderData): Promise<boolean> {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('SendGrid API key not found, email reminder not sent');
      return false;
    }

    const msg = {
      to: data.userEmail,
      from: process.env.EMAIL_FROM || 'noreply@compassiontracker.org',
      subject: `🔔 Medication Reminder: ${data.medicationName} for ${data.recipientName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #673AB7 0%, #512DA8 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🔔 Medication Reminder</h1>
          </div>
          
          <div style="padding: 30px; background-color: white;">
            <p style="color: #1f2937; line-height: 1.6; font-size: 18px; margin-bottom: 20px;">
              Hi <strong>${data.userName}</strong>,
            </p>
            
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
              <h2 style="color: #92400e; margin: 0 0 10px 0; font-size: 20px;">Time for Medication</h2>
              <p style="color: #92400e; margin: 5px 0; font-size: 16px;"><strong>Patient:</strong> ${data.recipientName}</p>
              <p style="color: #92400e; margin: 5px 0; font-size: 16px;"><strong>Medication:</strong> ${data.medicationName}</p>
              <p style="color: #92400e; margin: 5px 0; font-size: 16px;"><strong>Dosage:</strong> ${data.dosage}</p>
              <p style="color: #92400e; margin: 5px 0; font-size: 16px;"><strong>Scheduled Time:</strong> ${data.scheduledTime}</p>
            </div>
            
            <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
              Please ensure this medication is taken as scheduled. Log into your Compassion Tracker to mark it as completed.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.REPLIT_DEV_DOMAIN || process.env.APP_URL || '#'}" 
                 style="background: linear-gradient(135deg, #673AB7 0%, #512DA8 100%); color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                Open Compassion Tracker
              </a>
            </div>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              This is an automated medication reminder from Compassion Tracker.<br>
              You can manage your notification preferences in your account settings.
            </p>
          </div>
        </div>
      `,
    };

    await sgMail.send(msg);
    console.log(`Medication reminder email sent to ${data.userEmail} for ${data.medicationName}`);
    return true;
  } catch (error) {
    console.error('Error sending medication reminder email:', error);
    return false;
  }
}

export async function sendMedicationReminderSMS(data: MedicationReminderData): Promise<boolean> {
  try {
    if (!twilioClient || !data.userPhone) {
      console.warn('Twilio not configured or phone number missing, SMS reminder not sent');
      return false;
    }

    const message = `🔔 MEDICATION REMINDER
${data.recipientName}: ${data.medicationName}
Dosage: ${data.dosage}
Time: ${data.scheduledTime}

Open Compassion Tracker to mark as completed.`;

    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: data.userPhone,
    });

    console.log(`Medication reminder SMS sent to ${data.userPhone} for ${data.medicationName}`);
    return true;
  } catch (error) {
    console.error('Error sending medication reminder SMS:', error);
    return false;
  }
}

export async function sendMedicationReminder(
  data: MedicationReminderData,
  preferences: { emailNotifications: boolean; smsNotifications: boolean; medicationReminders: boolean }
): Promise<{ emailSent: boolean; smsSent: boolean }> {
  const results = { emailSent: false, smsSent: false };

  if (!preferences.medicationReminders) {
    console.log('Medication reminders disabled for user');
    return results;
  }

  // Send email notification
  if (preferences.emailNotifications) {
    results.emailSent = await sendMedicationReminderEmail(data);
  }

  // Send SMS notification
  if (preferences.smsNotifications && data.userPhone) {
    results.smsSent = await sendMedicationReminderSMS(data);
  }

  return results;
}