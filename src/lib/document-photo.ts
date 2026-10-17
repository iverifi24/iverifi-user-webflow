export interface QuestionCredential {
  id: string;
  document_type?: string | null;
  face_url?: string | null;
  photo_check?: string | null;
  photo_user_answer?: boolean | null;
  is_family_member?: boolean;
}

/** documents whose photo we could not confirm and that the person has not answered about yet */
export const unansweredDocuments = (creds: QuestionCredential[]) =>
  creds.filter((c) => !c.is_family_member && c.face_url && (c.photo_check === "second_check" || c.photo_check === "no_match") && c.photo_user_answer == null);
