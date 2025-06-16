import { pgTable, text, serial, integer, boolean, timestamp, jsonb, date, time, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Care Recipients
export const careRecipients = pgTable("care_recipients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#4F46E5"), // Default to primary color
  status: text("status").notNull().default("active"),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Medications
export const medications = pgTable("medications", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  dosage: text("dosage").notNull(),
  instructions: text("instructions"),
  icon: text("icon").default("pills"),
  iconColor: text("icon_color").default("#4F46E5"),
  careRecipientId: integer("care_recipient_id").references(() => careRecipients.id).notNull(),
  doctorId: integer("doctor_id").references(() => doctors.id),
  prescriptionNumber: text("prescription_number"),
  expirationDate: date("expiration_date"),
  // Inventory tracking fields
  currentQuantity: integer("current_quantity").default(0),
  reorderThreshold: integer("reorder_threshold").default(5),
  daysToReorder: integer("days_to_reorder").default(7), // Days in advance to alert for reorder (1-30 days)
  originalQuantity: integer("original_quantity").default(0), // Original prescription amount
  refillsRemaining: integer("refills_remaining").default(0),
  lastRefillDate: date("last_refill_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Medication Schedules
export const medicationSchedules = pgTable("medication_schedules", {
  id: serial("id").primaryKey(),
  medicationId: integer("medication_id").references(() => medications.id).notNull(),
  time: time("time").notNull(),
  daysOfWeek: jsonb("days_of_week").notNull(), // Array of days (0-6, Sunday-Saturday)
  quantity: text("quantity").notNull(), // e.g., "1 tablet", "2 pills"
  withFood: boolean("with_food").default(false),
  active: boolean("active").default(true),
  reminderEnabled: boolean("reminder_enabled").default(true),
  asNeeded: boolean("as_needed").default(false), // Field for as-needed medications
  specificDays: jsonb("specific_days").default([]),  // Specific calendar days (MM/DD/YYYY)
  isTapering: boolean("is_tapering").default(false), // Whether this is a tapering schedule
  taperingSchedule: jsonb("tapering_schedule").default([]), // Array of {startDate, endDate, quantity}
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Medication Logs
export const medicationLogs = pgTable("medication_logs", {
  id: serial("id").primaryKey(),
  medicationId: integer("medication_id").references(() => medications.id).notNull(),
  scheduleId: integer("schedule_id").references(() => medicationSchedules.id),
  taken: boolean("taken").notNull().default(true),
  takenAt: timestamp("taken_at").notNull().defaultNow(),
  notes: text("notes"),
  careRecipientId: integer("care_recipient_id").references(() => careRecipients.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Appointments
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  date: date("date").notNull(),
  time: time("time").notNull(),
  location: text("location"),
  notes: text("notes"),
  reminderEnabled: boolean("reminder_enabled").default(true),
  careRecipientId: integer("care_recipient_id").references(() => careRecipients.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Meals
export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // breakfast, lunch, dinner, snack
  food: text("food").notNull(),
  notes: text("notes"),
  consumedAt: timestamp("consumed_at").notNull().defaultNow(),
  careRecipientId: integer("care_recipient_id").references(() => careRecipients.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Bowel Movements
export const bowelMovements = pgTable("bowel_movements", {
  id: serial("id").primaryKey(),
  type: text("type"), // e.g. solid, liquid, etc.
  notes: text("notes"),
  occuredAt: timestamp("occured_at").notNull().defaultNow(),
  careRecipientId: integer("care_recipient_id").references(() => careRecipients.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Urination
export const urination = pgTable("urination", {
  id: serial("id").primaryKey(),
  color: text("color"), // clear, light yellow, dark yellow, amber, etc.
  frequency: text("frequency"), // normal, frequent, infrequent
  volume: integer("volume"), // volume in milliliters
  urgency: text("urgency"), // normal, urgent, very urgent
  notes: text("notes"),
  occuredAt: timestamp("occured_at").notNull().defaultNow(),
  careRecipientId: integer("care_recipient_id").references(() => careRecipients.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Supplies
export const supplies = pgTable("supplies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull().default(0),
  threshold: integer("threshold"), // Min threshold for low supply alert
  careRecipientId: integer("care_recipient_id").references(() => careRecipients.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Supply Usage
export const supplyUsages = pgTable("supply_usages", {
  id: serial("id").primaryKey(),
  supplyId: integer("supply_id").references(() => supplies.id).notNull(),
  quantity: integer("quantity").notNull().default(1),
  usedAt: timestamp("used_at").notNull().defaultNow(),
  careRecipientId: integer("care_recipient_id").references(() => careRecipients.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Sleep
export const sleep = pgTable("sleep", {
  id: serial("id").primaryKey(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  quality: text("quality"), // good, fair, poor
  interruptions: integer("interruptions").default(0),
  notes: text("notes"),
  careRecipientId: integer("care_recipient_id").references(() => careRecipients.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Notes
export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  careRecipientId: integer("care_recipient_id").references(() => careRecipients.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Inspiration Messages
export const inspirationMessages = pgTable("inspiration_messages", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  author: text("author"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Doctors
export const doctors = pgTable("doctors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  specialty: text("specialty").notNull(),
  phoneNumber: text("phone_number").notNull(),
  address: text("address"),
  email: text("email"),
  notes: text("notes"),
  careRecipientId: integer("care_recipient_id").references(() => careRecipients.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Emergency Info (contains sensitive information)
export const emergencyInfo = pgTable("emergency_info", {
  id: serial("id").primaryKey(),
  careRecipientId: integer("care_recipient_id").references(() => careRecipients.id).notNull(),
  dateOfBirth: date("date_of_birth"),
  socialSecurityNumber: text("social_security_number"),
  insuranceProvider: text("insurance_provider"),
  insurancePolicyNumber: text("insurance_policy_number"),
  insuranceGroupNumber: text("insurance_group_number"),
  insurancePhone: text("insurance_phone"),
  emergencyContact1Name: text("emergency_contact1_name"),
  emergencyContact1Phone: text("emergency_contact1_phone"),
  emergencyContact1Relation: text("emergency_contact1_relation"),
  emergencyContact2Name: text("emergency_contact2_name"),
  emergencyContact2Phone: text("emergency_contact2_phone"),
  emergencyContact2Relation: text("emergency_contact2_relation"),
  allergies: text("allergies"), // General allergies (food, environmental, etc.)
  medicationAllergies: text("medication_allergies"), // Specific medication allergies
  additionalInfo: text("additional_info"),
  bloodType: text("blood_type"),
  advanceDirectives: boolean("advance_directives").default(false),
  dnrOrder: boolean("dnr_order").default(false),
  pinHash: text("pin_hash"), // Securely stored PIN hash
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Pharmacies
export const pharmacies = pgTable("pharmacies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  phoneNumber: text("phone_number").notNull(),
  notes: text("notes"),
  careRecipientId: integer("care_recipient_id").references(() => careRecipients.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Medication Pharmacy Relation - which medications are filled at which pharmacies
export const medicationPharmacies = pgTable("medication_pharmacies", {
  id: serial("id").primaryKey(),
  medicationId: integer("medication_id").references(() => medications.id).notNull(),
  pharmacyId: integer("pharmacy_id").references(() => pharmacies.id).notNull(),
  refillInfo: text("refill_info"),
  lastRefillDate: date("last_refill_date"),
  nextRefillDate: date("next_refill_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Blood Pressure tracking
export const bloodPressure = pgTable("blood_pressure", {
  id: serial("id").primaryKey(),
  careRecipientId: integer("care_recipient_id").references(() => careRecipients.id).notNull(),
  systolic: integer("systolic").notNull(), // The top number in blood pressure reading (e.g., 120 in 120/80)
  diastolic: integer("diastolic").notNull(), // The bottom number in blood pressure reading (e.g., 80 in 120/80)
  pulse: integer("pulse"), // Heart rate in beats per minute
  oxygenLevel: integer("oxygen_level"), // Blood oxygen saturation level (SpO2) as percentage
  timeOfReading: timestamp("time_of_reading").notNull(),
  position: text("position"), // Standing, sitting, or lying down
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Glucose tracking
export const glucose = pgTable("glucose", {
  id: serial("id").primaryKey(),
  careRecipientId: integer("care_recipient_id").references(() => careRecipients.id).notNull(),
  level: integer("level").notNull(), // Blood glucose level (e.g., 120 mg/dL)
  timeOfReading: timestamp("time_of_reading").notNull(),
  readingType: text("reading_type").notNull(), // Fasting, before meal, after meal, bedtime, etc.
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Insulin tracking
export const insulin = pgTable("insulin", {
  id: serial("id").primaryKey(),
  careRecipientId: integer("care_recipient_id").references(() => careRecipients.id).notNull(),
  units: integer("units").notNull(), // Units of insulin administered
  insulinType: text("insulin_type").notNull(), // Type of insulin (e.g., Rapid-acting, Long-acting)
  timeAdministered: timestamp("time_administered").notNull(),
  site: text("site"), // Injection site (e.g., abdomen, thigh)
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Users table (keeping existing structure)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  email: varchar("email", { length: 255 }).unique(),
  phone: text("phone"), // Phone number for SMS notifications
  emailNotifications: boolean("email_notifications").default(true),
  smsNotifications: boolean("sms_notifications").default(false),
  medicationReminders: boolean("medication_reminders").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// WebAuthn credentials table for biometric authentication
export const webauthnCredentials = pgTable("webauthn_credentials", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  credentialId: text("credential_id").notNull().unique(),
  publicKey: text("public_key").notNull(),
  counter: integer("counter").notNull(),
  transports: text("transports"), // Comma-separated list of transports
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  careRecipients: many(careRecipients),
  webauthnCredentials: many(webauthnCredentials)
}));

export const webauthnCredentialsRelations = relations(webauthnCredentials, ({ one }) => ({
  user: one(users, {
    fields: [webauthnCredentials.userId],
    references: [users.id]
  })
}));

export const careRecipientsRelations = relations(careRecipients, ({ one, many }) => ({
  user: one(users, {
    fields: [careRecipients.userId],
    references: [users.id]
  }),
  medications: many(medications),
  appointments: many(appointments),
  meals: many(meals),
  bowelMovements: many(bowelMovements),
  urinationRecords: many(urination),
  supplies: many(supplies),
  sleepRecords: many(sleep),
  notes: many(notes),
  doctors: many(doctors),
  pharmacies: many(pharmacies),
  emergencyInfo: many(emergencyInfo),
  bloodPressureReadings: many(bloodPressure),
  glucoseReadings: many(glucose),
  insulinRecords: many(insulin)
}));

export const medicationsRelations = relations(medications, ({ one, many }) => ({
  careRecipient: one(careRecipients, {
    fields: [medications.careRecipientId],
    references: [careRecipients.id]
  }),
  prescribingDoctor: one(doctors, {
    fields: [medications.doctorId],
    references: [doctors.id]
  }),
  schedules: many(medicationSchedules),
  logs: many(medicationLogs),
  pharmacyRelations: many(medicationPharmacies)
}));

export const doctorsRelations = relations(doctors, ({ one, many }) => ({
  careRecipient: one(careRecipients, {
    fields: [doctors.careRecipientId],
    references: [careRecipients.id]
  }),
  prescriptions: many(medications)
}));

export const pharmaciesRelations = relations(pharmacies, ({ one, many }) => ({
  careRecipient: one(careRecipients, {
    fields: [pharmacies.careRecipientId],
    references: [careRecipients.id]
  }),
  medicationRelations: many(medicationPharmacies)
}));

export const medicationPharmaciesRelations = relations(medicationPharmacies, ({ one }) => ({
  medication: one(medications, {
    fields: [medicationPharmacies.medicationId],
    references: [medications.id]
  }),
  pharmacy: one(pharmacies, {
    fields: [medicationPharmacies.pharmacyId],
    references: [pharmacies.id]
  })
}));

export const medicationSchedulesRelations = relations(medicationSchedules, ({ one, many }) => ({
  medication: one(medications, {
    fields: [medicationSchedules.medicationId],
    references: [medications.id]
  }),
  logs: many(medicationLogs)
}));

export const medicationLogsRelations = relations(medicationLogs, ({ one }) => ({
  medication: one(medications, {
    fields: [medicationLogs.medicationId],
    references: [medications.id]
  }),
  schedule: one(medicationSchedules, {
    fields: [medicationLogs.scheduleId],
    references: [medicationSchedules.id]
  }),
  careRecipient: one(careRecipients, {
    fields: [medicationLogs.careRecipientId],
    references: [careRecipients.id]
  })
}));

export const emergencyInfoRelations = relations(emergencyInfo, ({ one }) => ({
  careRecipient: one(careRecipients, {
    fields: [emergencyInfo.careRecipientId],
    references: [careRecipients.id]
  })
}));

// Create insert/select schemas for validation
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true
});

export const insertWebAuthnCredentialSchema = createInsertSchema(webauthnCredentials);

export const insertCareRecipientSchema = createInsertSchema(careRecipients).pick({
  name: true,
  color: true,
  status: true,
  userId: true
});

export const insertMedicationSchema = createInsertSchema(medications);

export const insertMedicationScheduleSchema = createInsertSchema(medicationSchedules);

export const insertMedicationLogSchema = createInsertSchema(medicationLogs);

export const insertAppointmentSchema = createInsertSchema(appointments);

export const insertMealSchema = createInsertSchema(meals);

export const insertBowelMovementSchema = createInsertSchema(bowelMovements);

export const insertUrinationSchema = createInsertSchema(urination);

export const insertSupplySchema = createInsertSchema(supplies);

export const insertSupplyUsageSchema = createInsertSchema(supplyUsages);

export const insertSleepSchema = createInsertSchema(sleep);

export const insertNoteSchema = createInsertSchema(notes);

export const insertInspirationMessageSchema = createInsertSchema(inspirationMessages);

export const insertDoctorSchema = createInsertSchema(doctors);

export const insertPharmacySchema = createInsertSchema(pharmacies);

export const insertMedicationPharmacySchema = createInsertSchema(medicationPharmacies);

export const insertEmergencyInfoSchema = createInsertSchema(emergencyInfo);

export const insertBloodPressureSchema = createInsertSchema(bloodPressure);
export const insertGlucoseSchema = createInsertSchema(glucose);
export const insertInsulinSchema = createInsertSchema(insulin);

// Define types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type EmergencyInfo = typeof emergencyInfo.$inferSelect;
export type InsertEmergencyInfo = z.infer<typeof insertEmergencyInfoSchema>;

export type CareRecipient = typeof careRecipients.$inferSelect;
export type InsertCareRecipient = z.infer<typeof insertCareRecipientSchema>;

export type Medication = typeof medications.$inferSelect;
export type InsertMedication = z.infer<typeof insertMedicationSchema>;

export type MedicationSchedule = typeof medicationSchedules.$inferSelect;
export type InsertMedicationSchedule = z.infer<typeof insertMedicationScheduleSchema>;

export type MedicationLog = typeof medicationLogs.$inferSelect;
export type InsertMedicationLog = z.infer<typeof insertMedicationLogSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type Meal = typeof meals.$inferSelect;
export type InsertMeal = z.infer<typeof insertMealSchema>;

export type BowelMovement = typeof bowelMovements.$inferSelect;
export type InsertBowelMovement = z.infer<typeof insertBowelMovementSchema>;

export type Urination = typeof urination.$inferSelect;
export type InsertUrination = z.infer<typeof insertUrinationSchema>;

export type Supply = typeof supplies.$inferSelect;
export type InsertSupply = z.infer<typeof insertSupplySchema>;

export type SupplyUsage = typeof supplyUsages.$inferSelect;
export type InsertSupplyUsage = z.infer<typeof insertSupplyUsageSchema>;

export type Sleep = typeof sleep.$inferSelect;
export type InsertSleep = z.infer<typeof insertSleepSchema>;

export type Note = typeof notes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;

export type InspirationMessage = typeof inspirationMessages.$inferSelect;
export type InsertInspirationMessage = z.infer<typeof insertInspirationMessageSchema>;

export type Doctor = typeof doctors.$inferSelect;
export type InsertDoctor = z.infer<typeof insertDoctorSchema>;

export type Pharmacy = typeof pharmacies.$inferSelect;
export type InsertPharmacy = z.infer<typeof insertPharmacySchema>;

export type MedicationPharmacy = typeof medicationPharmacies.$inferSelect;
export type InsertMedicationPharmacy = z.infer<typeof insertMedicationPharmacySchema>;

export type BloodPressure = typeof bloodPressure.$inferSelect;
export type InsertBloodPressure = z.infer<typeof insertBloodPressureSchema>;

export type Glucose = typeof glucose.$inferSelect;
export type InsertGlucose = z.infer<typeof insertGlucoseSchema>;

export type Insulin = typeof insulin.$inferSelect;
export type InsertInsulin = z.infer<typeof insertInsulinSchema>;

export type WebAuthnCredential = typeof webauthnCredentials.$inferSelect;
export type InsertWebAuthnCredential = z.infer<typeof insertWebAuthnCredentialSchema>;
