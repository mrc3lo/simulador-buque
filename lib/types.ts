export type Role = "teacher" | "student";
export type RoomStatus = "active" | "closed";
export type Side = "port" | "starboard";
export type ActionKind = "add" | "remove" | "reset" | "close" | "join";

export interface RoomSummary {
  id: string;
  code: string;
  title: string;
  teacherName: string;
  status: RoomStatus;
  createdAt: string;
}

export interface Participant {
  id: string;
  displayName: string;
  role: Role;
  lastSeenAt: string;
  loadCount: number;
}

export interface CargoLoad {
  id: string;
  participantId: string;
  actorName: string;
  side: Side;
  massKg: number;
  longitudinal: number;
  createdAt: string;
}

export interface Activity {
  id: string;
  actorName: string;
  kind: ActionKind;
  side: Side | null;
  massKg: number | null;
  createdAt: string;
}

export interface RoomState {
  room: RoomSummary;
  participants: Participant[];
  loads: CargoLoad[];
  activities: Activity[];
  fetchedAt: string;
}

export interface SessionIdentity {
  roomCode: string;
  participantId: string;
  displayName: string;
  role: Role;
  token: string;
}

export interface ActionInput {
  type: "add" | "remove" | "reset" | "close";
  side?: Side;
  massKg?: number;
  longitudinal?: number;
}
