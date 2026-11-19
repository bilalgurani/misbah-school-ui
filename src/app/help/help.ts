import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { SUPPORT_CONTACT } from './support-config';

interface Faq {
  question: string;
  answer: string;
  adminOnly?: boolean;
}

interface Guide {
  title: string;
  steps: string[];
  adminOnly?: boolean;
}

@Component({
  imports: [RouterLink],
  selector: 'app-help',
  styleUrl: './help.scss',
  templateUrl: './help.html',
})
export class Help {
  private authService = inject(AuthService);

  isAdmin = this.authService.isAdmin;
  contact = SUPPORT_CONTACT;
  hasContact = !!(SUPPORT_CONTACT.email || SUPPORT_CONTACT.phone);

  private allGuides: Guide[] = [
    {
      title: 'Mark student attendance',
      steps: [
        'Open Students > Attendance from the menu.',
        'Choose the class section and the date.',
        'Mark each student Present or Absent. "Mark all" sets the whole class at once.',
        'Press Submit. You can come back the same day and submit again to correct a mistake.',
      ],
    },
    {
      title: 'Notify parents about absentees',
      steps: [
        'After saving attendance, press "Notify parents of absentees", then tap WhatsApp or SMS next to each student.',
        'Your own phone app opens with the message ready. Press send.',
      ],
    },
    {
      title: 'View attendance reports',
      steps: [
        'Reports > Monthly Register shows every student day by day for a class.',
        'Reports > Student-wise shows one student\'s attendance across the year.',
        'Use Export CSV to open the data in Excel, or Print for a paper copy.',
      ],
    },
    {
      title: 'Apply for leave',
      steps: [
        'Open Leave > My Leave and check your balances.',
        'Choose the leave type and the dates. Sundays and school holidays are not counted.',
        'For one day you can tick Half day, which counts as 0.5 day.',
        'Press Apply. The administrator approves or rejects it, and you can cancel a pending request.',
      ],
    },
    {
      title: 'Approve or reject leave',
      adminOnly: true,
      steps: [
        'Open Leave > Leave Requests. Pending requests are shown first.',
        'Press Approve (a note is optional) or Reject (a reason is required).',
        'Use "Record leave for a teacher" when someone was absent without applying.',
        'Leave > Leave Settings holds the leave types, yearly days and balances. Use an adjustment for carry-forward or corrections.',
      ],
    },
    {
      title: 'Enter exam marks',
      steps: [
        'Open Exams > Enter Marks.',
        'Choose the exam, the class section and the subject.',
        'Type each student\'s marks, or tick Absent. Marks above the maximum are rejected.',
        'Press Save marks. You can come back and correct them later.',
      ],
    },
    {
      title: 'Print a report card',
      steps: [
        'Open Exams > Report Card and pick the student.',
        'Check that all marks are entered. Exams with missing marks show "Marks pending".',
        'Press Print. Ranks are shown only after every subject has marks for the class.',
      ],
    },
    {
      title: 'Choose what teachers rate on the progress card',
      adminOnly: true,
      steps: [
        'Open Exams > Skill Criteria. Nothing is added for you, so start by adding your own items.',
        'Add life skills (for example Communication), values (for example Honesty) and participation items (for example Sports).',
        'Rename an item any time. An item that has already been rated can\'t be deleted: deactivate it so the saved ratings stay on old cards.',
      ],
    },
    {
      title: 'Fill in life skills, values and a teacher remark',
      steps: [
        'Open Exams > Skills & Remarks and choose the academic year, the term and the class.',
        'Pick a student and rate each life skill, value and participation item from 1 (needs improvement) to 5 (outstanding).',
        'Add a short teacher remark, then press Save & next to move on to the next student.',
      ],
    },
    {
      title: 'Print a holistic progress card',
      steps: [
        'Open Exams > Progress Card, pick the student, the academic year and the term.',
        'The card combines exam results, attendance with its trend arrow, the ratings and the teacher remark.',
        'The arrow is green and points up when attendance improved on the previous month, and red pointing down when it dropped.',
        'Press Print. Sections with nothing recorded yet show "Not assessed" or a short message.',
      ],
    },
    {
      title: 'Print progress cards for a whole class',
      steps: [
        'Open Exams > Class Cards and choose the academic year, the term and the class.',
        'Wait for the cards to appear. Students whose skills or remark are not filled in yet are listed above the cards so you can complete them first.',
        'Press Print. Every student gets one card on its own A4 page, in roll number order. Choose "Save as PDF" in the print window to share them instead.',
      ],
    },
    {
      title: 'Set up an exam',
      adminOnly: true,
      steps: [
        'Open Exams > Exam Setup and add your subjects once.',
        'Create the exam for the academic year (for example "Unit Test 1").',
        'For each class, choose its subjects with the maximum and pass marks. Use "Copy to other classes" to save time.',
      ],
    },
    {
      title: 'Record income and expenses',
      adminOnly: true,
      steps: [
        'Open Finance > Financials and press Add entry.',
        'Choose income or expense, the category, the amount and how it was paid.',
        'Fee collections appear automatically, so don\'t enter them again.',
        'A wrong entry can\'t be deleted. Void it with a reason and enter it again correctly.',
      ],
    },
    {
      title: 'Download a database backup',
      adminOnly: true,
      steps: [
        'Open Administration > Database Backup and press Download full backup.',
        'Save the file somewhere safe, for example a pen drive or cloud drive.',
        'Do this at least weekly, and before every term or upgrade.',
      ],
    },
    {
      title: 'Create a login for a new teacher',
      adminOnly: true,
      steps: [
        'Add the teacher first from Teachers > Add Teacher.',
        'Open your profile menu > Register user and link the account to that teacher.',
        'Share the temporary password with the teacher. They will be asked to set their own at first sign-in.',
      ],
    },
    {
      title: 'Reset a forgotten password',
      adminOnly: true,
      steps: [
        'Open your profile menu > Reset User Password.',
        'Press Reset password next to the user and enter a temporary password.',
        'The user must choose a new password the next time they sign in.',
      ],
    },
    {
      title: 'Add many students at once',
      adminOnly: true,
      steps: [
        'Open Students > Directory > Import.',
        'Download the template, fill it in and upload it.',
        'Review the preview, fix any highlighted rows, then press Import valid rows.',
      ],
    },
    {
      title: 'Collect a fee and print a receipt',
      adminOnly: true,
      steps: [
        'Finance > Fee Setup: define the installments and amounts for each class once per year.',
        'Finance > Collect Fee: search the student, press Collect on an installment and enter the amount.',
        'The receipt opens automatically and can be printed.',
        'Finance > Fee Dues lists everyone with a balance and can send reminders to parents.',
      ],
    },
    {
      title: 'Add school holidays',
      adminOnly: true,
      steps: [
        'Open Reports > Holidays & Working Days.',
        'Add the date, name and type (public, government or school).',
        'Sundays are closed automatically. Attendance can\'t be marked on closed days.',
      ],
    },
  ];

  private allFaqs: Faq[] = [
    {
      question: 'I forgot my password. What should I do?',
      answer: 'Ask the school administrator to reset it for you. You will get a temporary password and be asked to choose a new one when you sign in.',
    },
    {
      question: 'Why was I signed out?',
      answer: 'For security you are signed out after about 30 minutes without activity, and every session ends after 12 hours. Changing your password also signs you out on every device.',
    },
    {
      question: 'Why can\'t I mark attendance for a date?',
      answer: 'Attendance can\'t be marked on Sundays or on school holidays. If the date should be a working day, ask the administrator to check the holiday list.',
    },
    {
      question: 'I marked someone wrongly. Can I fix it?',
      answer: 'Yes. Open the same class and date, change the status and submit again. The latest submission replaces the earlier one.',
    },
    {
      question: 'Why do I not see some menu items?',
      answer: 'Teacher accounts can mark attendance, view students and see reports. Admission, fees, staff and settings are available only to administrators.',
    },
    {
      question: 'A parent says they did not get the absence message.',
      answer: 'Check that the student\'s mobile number is correct in the student directory.',
      adminOnly: true,
    },
    {
      question: 'Can I see who changed a record?',
      answer: 'Yes. Administration > Audit Log lists every change with the user, the time and what was done.',
      adminOnly: true,
    },
    {
      question: 'How do I move students to the next class?',
      answer: 'Create the new academic year, set it as current, then use Academics > Promote Students.',
      adminOnly: true,
    },
  ];

  guides = computed(() => this.allGuides.filter(g => !g.adminOnly || this.isAdmin()));
  faqs = computed(() => this.allFaqs.filter(f => !f.adminOnly || this.isAdmin()));
}
