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
        'After saving attendance, press "Notify parents of absentees".',
        'Choose SMS, WhatsApp or both, then confirm.',
        'Each parent is messaged only once per day for the same student.',
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
      answer: 'Check that the student\'s mobile number is correct in the directory. Administrators can see the delivery status of every message under Finance > Parent Messages.',
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
