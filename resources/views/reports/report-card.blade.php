<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Student Report Card</title>

    <style>
        @page {
            margin: 28px 32px;
        }

        body {
            font-family: DejaVu Sans, sans-serif;
            color: #263445;
            font-size: 10px;
        }

        .school-header {
            text-align: center;
            border-bottom: 3px solid #176b3a;
            padding-bottom: 13px;
            margin-bottom: 18px;
        }

        .school-header h1 {
            color: #0e2a47;
            font-size: 21px;
            margin: 0 0 6px;
            text-transform: uppercase;
        }

        .school-header p {
            margin: 3px 0;
            color: #64748b;
        }

        .document-title {
            text-align: center;
            margin: 15px 0;
        }

        .document-title h2 {
            display: inline-block;
            background: #0e2a47;
            color: #fff;
            padding: 9px 25px;
            font-size: 13px;
            letter-spacing: 1px;
            margin: 0;
        }

        .student-info {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 17px;
        }

        .student-info td {
            border: 1px solid #dce4e0;
            padding: 8px;
            width: 25%;
        }

        .label {
            color: #64748b;
            font-size: 8px;
            display: block;
            margin-bottom: 4px;
            text-transform: uppercase;
        }

        .value {
            color: #0e2a47;
            font-weight: bold;
            font-size: 10px;
        }

        .section-title {
            color: #0e2a47;
            font-size: 12px;
            font-weight: bold;
            margin: 15px 0 8px;
        }

        .scores-table {
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 15px;
        }

        .scores-table th {
            background: #0e2a47;
            color: #fff;
            padding: 9px 5px;
            font-size: 8px;
            text-align: center;
        }

        .scores-table td {
            border: 1px solid #dce4e0;
            padding: 8px 5px;
            text-align: center;
            font-size: 8px;
        }

        .scores-table td:first-child {
            text-align: left;
            font-weight: bold;
        }

        .scores-table tbody tr:nth-child(even) {
            background: #f5f8f6;
        }

        .summary-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0 18px;
        }

        .summary-table td {
            background: #edf7f0;
            border: 1px solid #d5e9db;
            padding: 11px 8px;
            text-align: center;
            width: 25%;
        }

        .summary-table strong {
            display: block;
            color: #0e2a47;
            font-size: 16px;
            margin-top: 5px;
        }

        .comments-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
        }

        .comments-table td {
            border: 1px solid #dce4e0;
            height: 53px;
            padding: 8px;
            vertical-align: top;
            width: 50%;
        }

        .signature {
            margin-top: 28px;
            width: 100%;
        }

        .signature td {
            width: 50%;
            padding-top: 8px;
            color: #64748b;
        }

        .footer {
            border-top: 1px solid #dce4e0;
            color: #87929b;
            font-size: 8px;
            margin-top: 20px;
            padding-top: 8px;
            text-align: center;
        }

        .grade {
            color: #176b3a;
            font-weight: bold;
        }
    </style>
</head>

<body>

    <div class="school-header">
        <h1>{{ $school->name ?? 'School Name' }}</h1>

        @if($school?->address)
            <p>{{ $school->address }}</p>
        @endif

        @if($school?->phone || $school?->email)
            <p>
                {{ $school->phone ?? '' }}
                @if($school->phone && $school->email)
                    |
                @endif
                {{ $school->email ?? '' }}
            </p>
        @endif
    </div>

    <div class="document-title">
        <h2>STUDENT ACADEMIC REPORT CARD</h2>
    </div>

    <table class="student-info">
        <tr>
            <td>
                <span class="label">Student Name</span>
                <span class="value">{{ $student->full_name }}</span>
            </td>
            <td>
                <span class="label">Admission Number</span>
                <span class="value">{{ $student->admission_number }}</span>
            </td>
            <td>
                <span class="label">Class</span>
                <span class="value">{{ $className ?: 'Not specified' }}</span>
            </td>
            <td>
                <span class="label">Gender</span>
                <span class="value">{{ $student->gender ?? '—' }}</span>
            </td>
        </tr>

        <tr>
            <td colspan="2">
                <span class="label">Academic Session</span>
                <span class="value">{{ $result->academicSession?->name ?? '—' }}</span>
            </td>
            <td>
                <span class="label">Term</span>
                <span class="value">{{ $result->term?->name ?? '—' }}</span>
            </td>
            <td>
                <span class="label">Date Published</span>
                <span class="value">
                    {{ $result->published_at?->format('d M Y') ?? '—' }}
                </span>
            </td>
        </tr>
    </table>

    <div class="section-title">SUBJECT PERFORMANCE</div>

    <table class="scores-table">
        <thead>
            <tr>
                <th style="text-align:left;">Subject</th>

                @foreach($components as $component)
                    <th>{{ strtoupper($component->code) }}<br>
                        ({{ number_format((float) $component->maximum_score, 0) }})
                    </th>
                @endforeach

                <th>Total</th>
                <th>Grade</th>
                <th>Remark</th>
            </tr>
        </thead>

        <tbody>
            @foreach($subjects as $subject)
                <tr>
                    <td>{{ $subject['name'] }}</td>

                    @foreach($components as $component)
                        @php
                            $score = $subject['scores']->get(strtoupper($component->code));
                        @endphp

                        <td>
                            {{ $score ? number_format((float) $score->score, 1) : '—' }}
                        </td>
                    @endforeach

                    <td><strong>{{ number_format((float) $subject['total'], 1) }}</strong></td>
                    <td class="grade">{{ $subject['grade'] ?? '—' }}</td>
                    <td>{{ $subject['remark'] ?? '—' }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="section-title">OVERALL PERFORMANCE</div>

    <table class="summary-table">
        <tr>
            <td>
                Total Score
                <strong>{{ number_format((float) $result->total_score, 2) }}</strong>
            </td>
            <td>
                Average
                <strong>{{ number_format((float) $result->average, 2) }}%</strong>
            </td>
            <td>
                Position
                <strong>{{ $result->position ? '#' . $result->position : '—' }}</strong>
            </td>
            <td>
                Overall Grade
                <strong>{{ $result->overall_grade ?? '—' }}</strong>
            </td>
        </tr>
    </table>

    <p>
        <strong>Overall Remark:</strong>
        {{ $result->overall_remark ?? '—' }}
    </p>

    <div class="section-title">TEACHER AND PRINCIPAL COMMENTS</div>

    <table class="comments-table">
        <tr>
            <td>
                <strong>Class Teacher's Comment:</strong>
            </td>
            <td>
                <strong>Principal's Comment:</strong>
            </td>
        </tr>
    </table>

    <table class="signature">
        <tr>
            <td>Class Teacher's Signature: ________________________</td>
            <td>Principal's Signature: ___________________________</td>
        </tr>
    </table>

    <div class="footer">
        Official student academic report card |
        {{ $school->name ?? 'School' }}
    </div>

</body>
</html>
