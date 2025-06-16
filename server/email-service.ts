import { randomBytes } from 'crypto';

// Initialize SendGrid with dynamic import to handle deployment
let sgMail: any = null;

async function initializeSendGrid() {
  if (process.env.SENDGRID_API_KEY && !sgMail) {
    try {
      const sendgridModule = await import('@sendgrid/mail');
      sgMail = sendgridModule.default;
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      console.log('SendGrid initialized successfully');
    } catch (error) {
      console.warn('SendGrid not available:', error.message);
    }
  }
}

// Initialize on startup
initializeSendGrid();

// Store password reset tokens in memory (in production, use Redis or database)
const resetTokens = new Map<string, { userId: number; expires: Date }>();

export function generateResetToken(): string {
  return randomBytes(32).toString('hex');
}

export function storeResetToken(token: string, userId: number): void {
  const expires = new Date();
  expires.setHours(expires.getHours() + 1); // Token expires in 1 hour
  resetTokens.set(token, { userId, expires });
}

export function validateResetToken(token: string): number | null {
  const tokenData = resetTokens.get(token);
  if (!tokenData || tokenData.expires < new Date()) {
    if (tokenData) resetTokens.delete(token); // Clean up expired token
    return null;
  }
  return tokenData.userId;
}

export function removeResetToken(token: string): void {
  resetTokens.delete(token);
}

export async function sendPasswordResetEmail(
  userEmail: string, 
  username: string, 
  resetToken: string
): Promise<boolean> {
  await initializeSendGrid();
  
  if (!sgMail) {
    console.warn('SendGrid not available, cannot send password reset email');
    return false;
  }
  
  try {
    const resetUrl = `https://${process.env.REPLIT_DEV_DOMAIN || 'localhost:5000'}/reset-password?token=${resetToken}`;

    const msg = {
      to: userEmail,
      from: process.env.EMAIL_FROM || 'noreply@compassiontracker.org',
      subject: 'Compassion Tracker - Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #673AB7 0%, #512DA8 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset Request</h1>
          </div>
          
          <div style="padding: 30px; background-color: white;">
            <p style="color: #1f2937; line-height: 1.6; font-size: 16px;">
              Hello <strong>${username}</strong>,
            </p>
            <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
              You requested a password reset for your Compassion Tracker account.
            </p>
            <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
              Click the button below to reset your password:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: linear-gradient(135deg, #673AB7 0%, #512DA8 100%); color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #4b5563; line-height: 1.6; font-size: 14px;">
              Or copy and paste this link in your browser:
            </p>
            <p style="word-break: break-all; color: #666; background-color: #f3f4f6; padding: 10px; border-radius: 4px;">${resetUrl}</p>
            <p style="color: #dc2626; font-weight: bold;">This link will expire in 1 hour.</p>
            <p style="color: #4b5563; line-height: 1.6; font-size: 14px;">
              If you didn't request this password reset, please ignore this email.
            </p>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              This is an automated message from Compassion Tracker. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
    };

    const result = await sgMail.send(msg);
    console.log('Password reset email sent successfully:', {
      messageId: result[0].headers['x-message-id'],
      to: userEmail,
      resetUrl: resetUrl
    });
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}

export async function sendWelcomeEmail(
  userEmail: string,
  userName: string
): Promise<boolean> {
  try {
    console.log(`Sending welcome email to ${userEmail} for user ${userName}`);
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: userEmail,
      subject: 'Welcome to Compassion Tracker! 💜',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc;">
          <div style="background: linear-gradient(135deg, #673AB7 0%, #512DA8 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Compassion Tracker! 💜</h1>
          </div>
          
          <div style="padding: 30px; background-color: white; margin: 20px;">
            <p style="color: #1f2937; line-height: 1.6; font-size: 16px;">
              Hi <strong>${userName}</strong>,
            </p>
            
            <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
              Welcome to Compassion Tracker — I'm Leigh Hacker, the founder, sole developer, and owner of this platform. I created this tool to help families and caregivers track health info, appointments, medications, and emergencies with ease and security.
            </p>
            
            <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
              You've successfully created your account — you're all set to begin.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.APP_URL || '#'}" style="background: linear-gradient(135deg, #673AB7 0%, #512DA8 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                👉 Click here to sign in
              </a>
            </div>
            
            <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
              If you have any questions, feedback, or run into issues, feel free to contact me directly at <a href="mailto:leighh@compassiontracker.org" style="color: #673AB7;">leighh@compassiontracker.org</a>. I personally read and respond to every message.
            </p>
            
            <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 25px 0;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>Please note:</strong> this message was sent from an unmonitored address. For help or support, always use my contact email above.
              </p>
            </div>
            
            <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
              Thank you again for trusting Compassion Tracker.
            </p>
            
            <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
              With appreciation,<br>
              <strong>Leigh Hacker</strong><br>
              Founder & Developer<br>
              📧 <a href="mailto:leighh@compassiontracker.org" style="color: #673AB7;">leighh@compassiontracker.org</a>
            </p>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              This email was sent because you created an account with Compassion Tracker.<br>
              If you didn't create this account, please contact our support team.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent successfully to ${userEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
}