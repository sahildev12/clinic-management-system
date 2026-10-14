"use client";

import { Bell, BellOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

/** The sound file lives at public/notification.wav and is served from /notification.wav */
const SOUND_URL = "/notification.wav";
const POLL_MS = 15_000;
const STORAGE_KEY = "clinic-appointment-sound";
const SOUND_EVENT = "clinic-appointment-sound-change";

type NewAppointment = {
  id: string;
  patientName: string;
  dateTime: string;
  doctorName: string | null;
};

function subscribeSound(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(SOUND_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(SOUND_EVENT, onStoreChange);
  };
}

function getSoundSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY) !== "off";
}

function getSoundServerSnapshot() {
  return true;
}

function describeAppointment(item: NewAppointment) {
  const when = new Date(item.dateTime).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
  return `${item.patientName} · ${when}${item.doctorName ? ` · ${item.doctorName}` : ""}`;
}

/**
 * Plays notification.wav and shows a toast whenever a patient books online.
 * Checks the server every 15 seconds while the admin page is open.
 */
export function NewAppointmentAlert() {
  const router = useRouter();
  const soundOn = useSyncExternalStore(subscribeSound, getSoundSnapshot, getSoundServerSnapshot);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const soundOnRef = useRef(soundOn);
  const sinceRef = useRef<string | null>(null);

  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  useEffect(() => {
    const audio = new Audio(SOUND_URL);
    audio.preload = "auto";
    audioRef.current = audio;
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  // Browsers only allow sound after the person has clicked or typed on the page once.
  const playSound = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.currentTime = 0;
      await audio.play();
      setSoundBlocked(false);
    } catch {
      setSoundBlocked(true);
    }
  }, []);

  // Once the browser blocked the sound, any click or key press unlocks it again.
  useEffect(() => {
    if (!soundBlocked) return;
    const unlock = () => setSoundBlocked(false);
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [soundBlocked]);

  useEffect(() => {
    async function check() {
      try {
        const query = sinceRef.current ? `?since=${encodeURIComponent(sinceRef.current)}` : "";
        const res = await fetch(`/api/admin/appointments/notifications${query}`, {
          cache: "no-store",
        });
        if (res.status === 401 || res.status === 403) {
          // This person cannot see appointments, so stop checking.
          clearInterval(timer);
          return;
        }
        if (!res.ok) return;

        const data = (await res.json()) as { now: string; items: NewAppointment[] };
        sinceRef.current = data.now;
        if (data.items.length === 0) return;

        if (soundOnRef.current) void playSound();
        data.items.slice(0, 3).forEach((item) => {
          toast.success("New appointment request", {
            description: describeAppointment(item),
            duration: 10_000,
          });
        });
        if (data.items.length > 3) {
          toast.info(`+${data.items.length - 3} more new appointment requests`);
        }
        router.refresh(); // dashboard numbers + list view
        window.dispatchEvent(new Event("clinic-appointments-changed")); // calendar views
      } catch {
        // Network hiccup: try again on the next check.
      }
    }

    const timer = setInterval(check, POLL_MS);
    void check();
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [playSound, router]);

  function handleClick() {
    // Sound is on but the browser blocked it: this click unlocks it and plays a test.
    if (soundOn && soundBlocked) {
      void playSound();
      return;
    }
    const next = !soundOn;
    window.localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
    window.dispatchEvent(new Event(SOUND_EVENT));
    if (next) void playSound(); // plays once as a test
  }

  const label = !soundOn
    ? "Appointment sound off"
    : soundBlocked
      ? "Click to enable sound"
      : "Appointment sound on";

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Plays a sound when a patient books online. Click to turn on or off."
      className={cn(
        "fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-2 text-xs font-medium shadow-md transition-colors hover:bg-muted print:hidden",
        soundOn && soundBlocked && "border-amber-400 text-amber-700"
      )}
    >
      {soundOn ? <Bell className="size-4" aria-hidden /> : <BellOff className="size-4" aria-hidden />}
      {label}
    </button>
  );
}