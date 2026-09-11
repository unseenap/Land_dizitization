"use client";

import {
  Archive,
  ArrowRight,
  Buildings,
  ChartDonut,
  CheckCircle,
  ClockCountdown,
  Database,
  FileArrowUp,
  FileImage,
  FilePdf,
  FileText,
  FolderOpen,
  GearSix,
  IconContext,
  ListChecks,
  MagnifyingGlass,
  MapTrifold,
  MapPin,
  ShieldCheck,
  SignOut,
  SpinnerGap,
  UsersThree,
  WarningCircle,
  XCircle,
  X,
} from "@phosphor-icons/react";
import type { ComponentProps } from "react";

export const appIcons = {
  archive: Archive,
  arrow: ArrowRight,
  audit: ListChecks,
  building: Buildings,
  dashboard: ChartDonut,
  database: Database,
  document: FileText,
  documents: FolderOpen,
  fileImage: FileImage,
  filePdf: FilePdf,
  feedback: CheckCircle,
  gis: MapTrifold,
  integrations: GearSix,
  location: MapPin,
  search: MagnifyingGlass,
  processing: ClockCountdown,
  security: ShieldCheck,
  signOut: SignOut,
  spinner: SpinnerGap,
  success: CheckCircle,
  upload: FileArrowUp,
  users: UsersThree,
  warning: WarningCircle,
  error: XCircle,
  clear: X,
} as const;

export type AppIconName = keyof typeof appIcons;

export function AppIcon({
  name,
  ...props
}: { name: AppIconName } & Omit<ComponentProps<typeof FileText>, "ref">) {
  const Icon = appIcons[name];
  return (
    <IconContext.Provider value={{ weight: "regular", mirrored: false }}>
      <Icon aria-hidden="true" focusable="false" {...props} />
    </IconContext.Provider>
  );
}
