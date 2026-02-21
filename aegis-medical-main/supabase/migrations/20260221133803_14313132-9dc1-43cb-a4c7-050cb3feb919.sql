
-- ============================================================
-- AEGIS FHIR DATABASE SCHEMA WITH STRICT RLS
-- ============================================================

-- 1. Role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('clinician', 'admin');

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Security definer helper to check roles (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 3. FHIR Patient table
CREATE TABLE public.fhir_patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type TEXT NOT NULL DEFAULT 'Patient',
    identifier_system TEXT,
    identifier_value TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    name_family TEXT NOT NULL,
    name_given TEXT[] DEFAULT '{}',
    gender TEXT CHECK (gender IN ('male', 'female', 'other', 'unknown')),
    birth_date DATE,
    telecom_system TEXT,
    telecom_value TEXT,
    address_line TEXT,
    address_city TEXT,
    address_state TEXT,
    address_postal_code TEXT,
    address_country TEXT,
    managing_organization TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.fhir_patients ENABLE ROW LEVEL SECURITY;

-- 4. FHIR Encounter table
CREATE TABLE public.fhir_encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type TEXT NOT NULL DEFAULT 'Encounter',
    status TEXT NOT NULL CHECK (status IN ('planned', 'in-progress', 'on-hold', 'discharged', 'completed', 'cancelled', 'discontinued', 'entered-in-error', 'unknown')),
    class_system TEXT DEFAULT 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
    class_code TEXT NOT NULL,
    class_display TEXT,
    type_system TEXT,
    type_code TEXT,
    type_display TEXT,
    priority_system TEXT,
    priority_code TEXT,
    priority_display TEXT,
    subject_id UUID NOT NULL REFERENCES public.fhir_patients(id) ON DELETE CASCADE,
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    reason_text TEXT,
    location_display TEXT,
    service_provider TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.fhir_encounters ENABLE ROW LEVEL SECURITY;

-- 5. FHIR Observation table
CREATE TABLE public.fhir_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type TEXT NOT NULL DEFAULT 'Observation',
    status TEXT NOT NULL CHECK (status IN ('registered', 'preliminary', 'final', 'amended', 'corrected', 'cancelled', 'entered-in-error', 'unknown')),
    category_system TEXT DEFAULT 'http://terminology.hl7.org/CodeSystem/observation-category',
    category_code TEXT,
    category_display TEXT,
    code_system TEXT DEFAULT 'http://loinc.org',
    code_code TEXT NOT NULL,
    code_display TEXT,
    subject_id UUID NOT NULL REFERENCES public.fhir_patients(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES public.fhir_encounters(id) ON DELETE SET NULL,
    effective_datetime TIMESTAMPTZ,
    issued TIMESTAMPTZ DEFAULT now(),
    performer_type TEXT,
    performer_reference TEXT,
    value_quantity_value NUMERIC,
    value_quantity_unit TEXT,
    value_quantity_system TEXT DEFAULT 'http://unitsofmeasure.org',
    value_quantity_code TEXT,
    value_string TEXT,
    interpretation_code TEXT,
    interpretation_display TEXT,
    note TEXT,
    data_absent_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.fhir_observations ENABLE ROW LEVEL SECURITY;

-- 6. Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_fhir_patients_updated_at
  BEFORE UPDATE ON public.fhir_patients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fhir_encounters_updated_at
  BEFORE UPDATE ON public.fhir_encounters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fhir_observations_updated_at
  BEFORE UPDATE ON public.fhir_observations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- FAILSAFE CHECK 2: RLS POLICY DEFINITIONS
-- Only authenticated users with 'clinician' role can CRUD
-- ============================================================

-- user_roles: Only clinicians can read their own role
CREATE POLICY "Clinicians can view own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- FHIR Patients: Full CRUD for clinicians only
CREATE POLICY "Clinicians can select patients"
  ON public.fhir_patients FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'clinician'));

CREATE POLICY "Clinicians can insert patients"
  ON public.fhir_patients FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'clinician'));

CREATE POLICY "Clinicians can update patients"
  ON public.fhir_patients FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'clinician'));

CREATE POLICY "Clinicians can delete patients"
  ON public.fhir_patients FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'clinician'));

-- FHIR Encounters: Full CRUD for clinicians only
CREATE POLICY "Clinicians can select encounters"
  ON public.fhir_encounters FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'clinician'));

CREATE POLICY "Clinicians can insert encounters"
  ON public.fhir_encounters FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'clinician'));

CREATE POLICY "Clinicians can update encounters"
  ON public.fhir_encounters FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'clinician'));

CREATE POLICY "Clinicians can delete encounters"
  ON public.fhir_encounters FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'clinician'));

-- FHIR Observations: Full CRUD for clinicians only
CREATE POLICY "Clinicians can select observations"
  ON public.fhir_observations FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'clinician'));

CREATE POLICY "Clinicians can insert observations"
  ON public.fhir_observations FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'clinician'));

CREATE POLICY "Clinicians can update observations"
  ON public.fhir_observations FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'clinician'));

CREATE POLICY "Clinicians can delete observations"
  ON public.fhir_observations FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'clinician'));

-- Indexes for performance
CREATE INDEX idx_fhir_patients_identifier ON public.fhir_patients(identifier_value);
CREATE INDEX idx_fhir_encounters_subject ON public.fhir_encounters(subject_id);
CREATE INDEX idx_fhir_encounters_status ON public.fhir_encounters(status);
CREATE INDEX idx_fhir_observations_subject ON public.fhir_observations(subject_id);
CREATE INDEX idx_fhir_observations_encounter ON public.fhir_observations(encounter_id);
CREATE INDEX idx_fhir_observations_code ON public.fhir_observations(code_code);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
