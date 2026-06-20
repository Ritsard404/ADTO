import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, "Current password must be at least 6 characters."),
  newPassword: z.string().min(8, "New password must be at least 8 characters."),
  confirmPassword: z.string().min(8, "Confirm the new password."),
}).refine((value) => value.newPassword === value.confirmPassword, {
  message: "New password and confirmation must match.",
  path: ["confirmPassword"],
});

export type LoginInput = z.infer<typeof loginSchema>;
