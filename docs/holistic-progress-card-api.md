# Holistic progress card: backend API

The UI (`src/app/progress/`) uses four endpoints under `/api/progress`, implemented in the backend repo. Everything else on the card already existed:

| Card section | Source |
| --- | --- |
| Academics | `GET /api/report-cards/{studentId}?academicYearId=` (existing) |
| Attendance and trend | `GET /api/reports/attendance/student/{studentId}?from=&to=` (existing, uses `months[]`) |
| Life skills, values, participation, remark | `/api/progress/*`, below |

Base path is `environment.apiUrl` (the existing `/api`). All endpoints need a logged-in user and return JSON.

## Concepts

- **Criterion**: one thing to rate, such as "Communication". Each belongs to a category: `LIFE_SKILLS`, `VALUES` or `PARTICIPATION`.
- **Assessment**: one student's ratings and teacher remark for one `(academicYearId, term)`. `term` is `1`, `2` or `3`.
- **Rating**: an integer from 1 to 5 (1 needs improvement, 2 satisfactory, 3 good, 4 very good, 5 outstanding).
- There is at most one assessment per `(studentId, academicYearId, term)`. Saving replaces it (upsert).

## Endpoints

### `GET /progress/criteria`

Returns the active criteria, ordered by category then `sortOrder`. Admin and teacher. Empty until an admin adds some.

```json
[
  { "id": 1, "category": "LIFE_SKILLS", "name": "Communication", "sortOrder": 1 },
  { "id": 9, "category": "VALUES", "name": "Honesty", "sortOrder": 1 },
  { "id": 15, "category": "PARTICIPATION", "name": "Sports", "sortOrder": 1 }
]
```

### Managing criteria (admin only)

| Call | Body | Result |
| --- | --- | --- |
| `GET /progress/criteria/all` | | Every criterion, including inactive ones, each with `active` and `ratingCount` |
| `POST /progress/criteria` | `{ "category": "VALUES", "name": "Honesty" }` | `{ "id": 9 }`. Goes to the end of its category |
| `PUT /progress/criteria/{id}` | `{ "name": "Integrity", "active": false }` (either field is optional) | The updated criterion |
| `DELETE /progress/criteria/{id}` | | 204. Returns 409 if the criterion already has ratings; deactivate it instead |

`category` is `LIFE_SKILLS`, `VALUES` or `PARTICIPATION` and can't be changed after creation. Names are trimmed, at most 100 characters, and unique within a category regardless of case (400 otherwise).

### `GET /progress/assessments?classSectionId=&academicYearId=&term=`

Returns the saved assessments for students currently enrolled in the section. Students with nothing saved are left out; the UI fills them in from the roster as "Pending".

```json
[
  {
    "studentId": 42,
    "academicYearId": 3,
    "term": 1,
    "ratings": [ { "criterionId": 1, "rating": 4 }, { "criterionId": 9, "rating": 5 } ],
    "remark": "Confident speaker. Needs to submit homework on time.",
    "updatedBy": "Mrs. Khan",
    "updatedAt": "2026-11-19T09:12:00Z"
  }
]
```

### `GET /progress/assessments/student/{studentId}?academicYearId=`

Returns the same objects for one student, one per term that has data (up to three). The card picks the term in the browser.

### `PUT /progress/assessments`

Creates or replaces one assessment and returns the saved object (same shape as above, with `updatedBy` and `updatedAt` filled in by the server).

```json
{
  "studentId": 42,
  "academicYearId": 3,
  "term": 1,
  "ratings": [ { "criterionId": 1, "rating": 4 } ],
  "remark": "Confident speaker."
}
```

Rules:

- `term` must be 1, 2 or 3. `rating` must be 1 to 5. Reject duplicate `criterionId`s and unknown or inactive criteria.
- `remark` is optional, trimmed, at most **500 characters**. The UI sends `null` when empty.
- `ratings` may be partial. The UI allows saving some criteria now and the rest later. A save that has no ratings and no remark is rejected with 400.
- The save **replaces** the ratings for that term. A criterion left out of the request is removed, not kept.
- The student must have an enrollment in `academicYearId`, otherwise 400.
- Return 400 with a readable message for validation errors, as the existing endpoints do. The UI shows it in a toast.

## Authorization

- Any logged-in teacher or admin can read criteria and read and write assessments (`/api/progress/**` is `ADMIN` + `TEACHER` in `SecurityBeansConfig`).
- Only admins can create, rename, deactivate or delete criteria.
- Teachers are not limited to their own class sections, the same as marks entry.
- Every save records `updatedBy` (the teacher's name, or the username for admins) and `updatedAt`, and is written to the audit log.

## Where it lives

The backend repo (`mishab-school`) has the implementation:

| Piece | File |
| --- | --- |
| Tables and starting criteria | `db/2026-11-progress-card.sql` (run once, safe to repeat) |
| Endpoints | `controller/ProgressController.java` |
| Validation and saving | `service/ProgressService.java` (tests in `ProgressServiceTest`) |
| Queries | `dao/ProgressRepository.java` |
| Request and response shapes | `dto/ProgressDtos.java` |

Starting criteria: none. The migration only creates the tables. An admin adds the life skills, values and participation items in the app (Exams > Skill Criteria). A criterion that already has ratings can't be deleted, only deactivated (`active = FALSE`), so old cards stay complete.

## Note on the attendance arrow

The card and the lists work out the arrow from `attendancePct` in the existing monthly register and student endpoints. The change must be at least 1 percentage point to show an arrow. Smaller changes show as steady. No backend change is needed.
