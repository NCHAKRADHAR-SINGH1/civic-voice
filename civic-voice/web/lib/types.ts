export type User = {
  id: string;
  role?: "CITIZEN" | "ADMIN" | "OWNER";
  canRequestAdminRole?: boolean;
  adminAccessDisabledAt?: string | null;
  mobile?: string | null;
  location?: {
    country?: string | null;
    state?: string | null;
    district?: string | null;
    cityVillage?: string | null;
  };
  locationUpdatedAt?: string | null;
};

export type AuditLog = {
  id: string;
  action:
    | "AUTHENTICATED"
    | "ROLE_UPDATED"
    | "LOCATION_UPDATED"
    | "ISSUE_CREATED"
    | "ISSUE_UPVOTED"
    | "COMMENT_ADDED"
    | "ISSUE_REPORTED"
    | "ISSUE_STATUS_UPDATED"
    | "ISSUE_RESOLVED"
    | "ADMIN_ACCESS_UPDATED";
  actorId?: string | null;
  entityType: string;
  entityId?: string | null;
  summary: string;
  createdAt: string;
  actorRole?: "CITIZEN" | "ADMIN" | "OWNER" | null;
  actor?: {
    id: string;
    mobile?: string | null;
    role: "CITIZEN" | "ADMIN" | "OWNER";
    state?: string | null;
    district?: string | null;
    cityVillage?: string | null;
  } | null;
};

export type OwnerAdmin = {
  mobile: string;
  location: {
    country: string;
    state: string;
    district: string;
    cityVillage: string;
  };
  hasAccount: boolean;
  role?: "CITIZEN" | "ADMIN" | "OWNER" | null;
  adminAccessDisabledAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type Issue = {
  id: string;
  title: string;
  description: string;
  category: string;
  imageUrl?: string | null;
  country: string;
  state: string;
  district: string;
  cityVillage: string;
  status: "REPORTED" | "IN_PROGRESS" | "RESOLVED";
  departmentTag?: string | null;
  resolutionProofImages?: string[];
  resolvedAt?: string | null;
  createdAt: string;
  _count: {
    upvotes: number;
    comments: number;
    reports: number;
  };
  comments: {
    id: string;
    text?: string | null;
    imageUrl?: string | null;
    createdAt: string;
    user: {
      id: string;
      mobile?: string | null;
    };
  }[];
  currentUserUpvoted?: boolean;
  isInUserLocation?: boolean;
};
