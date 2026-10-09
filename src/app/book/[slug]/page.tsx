import { redirect } from "next/navigation";

/** Single-clinic app — legacy slug URLs redirect to the main booking page. */
export default function BookClinicRedirect() {
  redirect("/appointment");
}
