// Raise TERMS_VERSION here and in TermsController.CURRENT_VERSION whenever the text below changes,
// so the admin is asked to accept again.
//
// DRAFT: this is a plain-language starting point, not legal advice. Have a lawyer review it
// (India's Digital Personal Data Protection Act, 2023 treats children's data specially) before going live
// with real schools, and replace the wording with what the school actually does.
export const TERMS_VERSION = '2026-11-v1';

export interface TermsSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export const TERMS_SECTIONS: TermsSection[] = [
  {
    heading: '1. What this is',
    paragraphs: [
      'This school management system helps the school record attendance, exam marks, fees, leave and progress reports. ' +
      'By accepting, the school confirms that it has read these Terms and agrees to the data consent below. ' +
      'The school is responsible for the personal data it enters; the software provider only stores and processes it on the school\'s behalf.',
    ],
  },
  {
    heading: '2. Data that is collected',
    bullets: [
      'Students: name, date of birth, gender, class and roll number, parents\' names, phone numbers, address, blood group, emergency contact, and optionally Aadhaar number.',
      'Their school records: attendance, exam marks, fee payments, progress ratings and teacher remarks, section changes and exit details.',
      'Staff: name, contact details, date of birth, qualification, attendance and leave.',
      'Login and activity: usernames, sign-in times and an audit log of who changed what.',
    ],
  },
  {
    heading: '3. Why it is collected',
    paragraphs: [
      'Only to run the school: taking attendance, preparing results and report cards, managing fees and staff leave, ' +
      'contacting parents, and meeting legal or board requirements. The data is not sold and is not used for advertising.',
    ],
  },
  {
    heading: '4. Children\'s data and parent or guardian consent',
    paragraphs: [
      'The school confirms that it has the consent of each student\'s parent or guardian to collect and process their child\'s data for the purposes above, ' +
      'and that it collects Aadhaar numbers only where it is allowed to and needed. The school will keep records of that consent and ' +
      'will correct or remove a student\'s data when a parent or guardian lawfully asks.',
    ],
  },
  {
    heading: '5. Who can see the data',
    bullets: [
      'Admins can see and change everything. Teachers see the classes, marks and reports they need for their work.',
      'The school must give logins only to its own staff, keep passwords private, and disable a login when someone leaves.',
      'Data is shared outside the school only when the law requires it or with the hosting service that runs the system.',
    ],
  },
  {
    heading: '6. Security',
    paragraphs: [
      'Passwords are stored in scrambled form, sessions expire, and repeated failed sign-ins are blocked. ' +
      'Database backups contain all personal data, so the school must keep downloaded backups private and delete copies it no longer needs. ' +
      'If the school suspects its data has been exposed, it must tell the software provider and the affected families without delay.',
    ],
  },
  {
    heading: '7. Keeping and deleting data',
    paragraphs: [
      'Data is kept while the student or staff member is with the school and for as long as the law or school records require afterwards. ' +
      'When data is no longer needed, the school should have it deleted.',
    ],
  },
  {
    heading: '8. The school\'s responsibilities',
    bullets: [
      'Keep the information accurate and up to date.',
      'Use the system only for school purposes.',
      'Not misuse, copy or share personal data outside the school.',
    ],
  },
  {
    heading: '9. Changes',
    paragraphs: [
      'If these Terms change, the admin will be asked to read and accept the new version before continuing.',
    ],
  },
];

export const TERMS_CHECKBOXES = {
  terms: 'I have read and agree to these Terms on behalf of the school.',
  consent:
    'I confirm the school has the consent of parents and guardians, and of staff, to collect and use their data as described above.',
};
