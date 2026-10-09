import { HeroSection } from "@/components/site/hero/HeroSection";

type Props = {
  clinicName: string;
  phone?: string | null;
};

export function SiteHero({ clinicName }: Props) {
  return <HeroSection clinicName={clinicName} />;
}
