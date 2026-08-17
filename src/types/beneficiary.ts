export type FamilyStatus = "normal" | "siblings" | "orphan";
export type BeneficiaryStatus = "pending" | "approved" | "rejected";
export type LineStatus = "waiting" | "accepted";
export type GuardianIdType = "أب" | "أم" | "آخر";

export type Family = {
  id: string;
  registration_number: number;
  guardian_name: string;
  guardian_phone: string;
  guardian_address: string;
  guardian_id_type: GuardianIdType;
  guardian_relation: string;
  guardian_cin: string;
  family_status: FamilyStatus;
  children_count: number;
  death_certificate_path: string | null;
  registration_fee: number;
  status: BeneficiaryStatus;
  created_at: string;
  updated_at: string;
};

export type Beneficiary = {
  id: string;
  family_id: string;
  registration_number: number;
  child_order: number;
  full_name: string;
  education_level: string;
  class_number: string;
  school: string;
  birth_date: string | null;
  birth_place: string;
  phone: string;
  gender: "ذكر" | "أنثى";
  address: string;
  photo_path: string | null;
  guardian_name: string;
  guardian_phone: string;
  guardian_address: string;
  guardian_id_type: GuardianIdType;
  guardian_relation: string;
  guardian_cin: string;
  route_number: string;
  bus_number: string;
  line_status: LineStatus;
  bus_stop_number: string;
  status: BeneficiaryStatus;
  created_at: string;
  updated_at: string;
};

export type FamilyWithChildren = Family & {
  beneficiaries: Beneficiary[];
};

export type BeneficiaryInsert = Omit<
  Beneficiary,
  "id" | "family_id" | "registration_number" | "created_at" | "updated_at"
>;