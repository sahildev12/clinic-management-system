import type { ComponentType } from "react";
import { CalendarDays, Heart, ShieldCheck, Users } from "lucide-react";

import { ToothIcon } from "@/components/site/hero/ToothIcon";

/** Recommended hero doctor photo specs for best results */
export const heroDoctorImageGuide = {
  /** Best fit for the tall right-side hero panel */
  portrait: { width: 1200, height: 1600, label: "3:4 portrait (recommended)" },
  /** Laptop hero image panel (fixed CSS canvas at 1024–1439px) */
  laptopPanel: {
    width: 942,
    height: 600,
    label: "Fixed 942×600px panel (object-fit: cover)",
  },
  tips: [
    "Upload portrait 1200×1600 with the doctor slightly right of center.",
    "Desktop uses a fixed 942×600px crop inside the C-curve.",
    "Save as JPG at public/images/hero/hero-doctor.jpg",
  ],
} as const;

export const heroDoctor = {
  name: "Dr. Aviral Mehta",
  credentials: "BDS, MDS – Orthodontist",
  experience: "10+ Years of Experience",
  image: "/images/hero/hero-doctor.jpg",
  imageAlt: "Dr. Aviral Mehta, clinic owner and orthodontist",
} as const;

export const heroTrust = {
  rating: "4.9/5",
  label: "Trusted by 2,000+ Happy Patients",
  avatars: [
    "/images/hero/avatar-1.jpg",
    "/images/hero/avatar-2.jpg",
    "/images/hero/avatar-3.jpg",
    "/images/hero/avatar-4.jpg",
  ],
} as const;

export type HeroFeature = {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

export const heroFeatures: HeroFeature[] = [
  {
    title: "Advanced Technology",
    description: "Modern equipment for safe treatment",
    icon: ToothIcon,
  },
  {
    title: "Experienced Dentists",
    description: "Skilled professionals you can trust",
    icon: Users,
  },
  {
    title: "Safe & Hygienic",
    description: "Sterilization standards for your safety",
    icon: ShieldCheck,
  },
  {
    title: "Easy Booking",
    description: "Quick & hassle-free appointments",
    icon: CalendarDays,
  },
  {
    title: "Personalized Care",
    description: "Treatment tailored to your needs",
    icon: Heart,
  },
];
