export const siteNav = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/services", label: "Treatments" },
  { href: "/appointment", label: "Appointment" },
  { href: "/contact", label: "Contact" },
] as const;

export const marketingTreatments = [
  {
    badge: "Popular",
    title: "Dental Cleaning",
    description: "Gentle scaling and polish for healthier gums and a fresher smile.",
    image:
      "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=800&q=80",
    featured: true,
  },
  {
    badge: "Valuable",
    title: "Cosmetic Whitening",
    description: "In-clinic whitening for a brighter, confident smile.",
    image:
      "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=800&q=80",
    featured: true,
  },
  {
    badge: "Care",
    title: "Root Canal Therapy",
    description: "Comfort-focused treatment to save teeth and ease pain.",
    image:
      "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=800&q=80",
    featured: true,
  },
  {
    badge: "Restore",
    title: "Fillings & Restorations",
    description: "Tooth-colored fillings and repairs that blend with your natural smile.",
    image:
      "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=800&q=80",
    featured: false,
  },
  {
    badge: "Align",
    title: "Orthodontic Consult",
    description: "Assessment and guidance for braces, aligners, and bite correction.",
    image:
      "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=800&q=80",
    featured: false,
  },
  {
    badge: "Family",
    title: "Pediatric Dentistry",
    description: "Gentle dental care for children in a calm, welcoming setting.",
    image:
      "https://images.unsplash.com/photo-1629909615184-74f495363b67?auto=format&fit=crop&w=800&q=80",
    featured: false,
  },
] as const;

export const featuredTreatments = marketingTreatments.filter((item) => item.featured);

export const marketingTestimonials = [
  {
    id: "hobert",
    name: "Hobert Fleming",
    role: "Cleaning patient",
    quote:
      "My cleaning was gentle and thorough. The team explained every step and booking online was effortless.",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    photo:
      "https://images.unsplash.com/photo-1629909615184-74f495363b67?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "camille",
    name: "Camille Baird",
    role: "Whitening patient",
    quote:
      "Whitening results looked natural. The clinic felt calm, modern, and genuinely focused on comfort.",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
    photo:
      "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "josie",
    name: "Josie Oneal",
    role: "Family patient",
    quote:
      "We bring the whole family here. Reminders, payments, and follow-ups stay clear without paperwork stress.",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80",
    photo:
      "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=900&q=80",
  },
] as const;

export const marketingStats = [
  { label: "Years of experience", value: "12+", icon: "years" as const },
  { label: "Happy patients", value: "8k+", icon: "patients" as const },
  { label: "Expert dentists", value: "12+", icon: "doctors" as const },
  { label: "Patient satisfaction", value: "98%", icon: "satisfaction" as const },
  { label: "Support available", value: "24/7", icon: "support" as const },
] as const;

export const marketingTrustBadges = [
  { label: "Easy Booking", description: "Book visits in minutes online" },
  { label: "Trusted Dentists", description: "Experienced dental clinicians" },
  { label: "Secure & Private", description: "Your records stay protected" },
  { label: "Gentle Care", description: "Comfort-first dental visits" },
] as const;

export const marketingFeatures = [
  {
    title: "Easy Booking",
    description: "Request a visit online and get confirmation from our desk.",
  },
  {
    title: "Digital Records",
    description: "Appointments, prescriptions, and payments in one place.",
  },
  {
    title: "Transparent Payments",
    description: "Clear receipts and payment history for every visit.",
  },
  {
    title: "Reminder Alerts",
    description: "Stay on top of cleanings and follow-up appointments.",
  },
] as const;

export const marketingBlogPosts = [
  {
    category: "Prevention",
    date: "Jul 12, 2026",
    title: "5 daily habits for healthier gums",
    excerpt: "Simple routines that protect enamel and reduce sensitivity.",
    image:
      "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=800&q=80",
    href: "/services",
  },
  {
    category: "Cosmetic",
    date: "Jul 4, 2026",
    title: "What to expect from professional whitening",
    excerpt: "How in-clinic whitening works and how long results last.",
    image:
      "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=800&q=80",
    href: "/services",
  },
  {
    category: "Family Care",
    date: "Jun 28, 2026",
    title: "Helping kids feel calm at the dentist",
    excerpt: "Practical tips for a positive first dental visit.",
    image:
      "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=800&q=80",
    href: "/about",
  },
] as const;

export const marketingServices = marketingTreatments.map((item) => item.title);

export const homeBookingServices = marketingTreatments.map((item) => ({
  value: item.title,
  label: item.title,
}));
