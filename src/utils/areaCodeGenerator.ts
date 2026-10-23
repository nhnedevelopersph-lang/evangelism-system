import { CsvMemberRow, UserRole } from '../types';

/**
 * Normalizes an area name into a clean uppercase alphanumeric slug for referral codes.
 * e.g. "Manila" -> "MANILA"
 *      "Manila North" -> "MANILANORTH"
 *      "Cebu" -> "CEBU"
 *      "Area 1" -> "AREA1"
 */
export function normalizeAreaPrefix(area: string): string {
  if (!area || !area.trim()) return 'ZION';

  const clean = area.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return clean || 'ZION';
}

/**
 * Finds the next unique, structured referral code formatted as:
 * {Area}{Sequential4DigitNumber} (e.g. MANILA0001, MANILA0002, CEBU0001)
 */
export function generateNextAreaReferralCode(area: string, existingCodes: string[]): string {
  const prefix = normalizeAreaPrefix(area);
  const regex = new RegExp(`^${prefix}(\\d{4})$`, 'i');

  let maxNum = 0;
  existingCodes.forEach((code) => {
    if (!code) return;
    const match = code.trim().toUpperCase().match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  });

  const nextNum = maxNum + 1;
  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

/**
 * Generates an internal Serial Number if none is provided
 */
export function generateSerialNumberFromReferralCode(referralCode: string): string {
  return `SN-${referralCode}`;
}

/**
 * Robust CSV parser supporting the exact required columns:
 * 1. Serial (or Serial Number)
 * 2. Name (or Member Name)
 * 3. Department
 * 4. Section
 * 5. Area
 * 6. Region
 * 7. Duty
 * 8. Role
 * Also parses optional Contact Number and Email if included.
 */
export function parseMemberCsv(
  csvContent: string,
  existingCodes: string[]
): { rows: CsvMemberRow[]; errors: string[]; areaSummary: Record<string, number> } {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      rows: [],
      errors: ['The CSV file is empty or missing a header row.'],
      areaSummary: {},
    };
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());

  // Map exact columns requested: Serial, Name, Department, Section, Area, Region, Ban, Duty, Role
  const colIndex = {
    serial: findColIndex(headers, ['serial', 'serial number', 'serial_number', 'sn', 'id']),
    name: findColIndex(headers, ['name', 'full name', 'member name', 'fullname']),
    department: findColIndex(headers, ['department', 'dept']),
    section: findColIndex(headers, ['section', 'sec']),
    area: findColIndex(headers, ['area', 'location', 'area/location', 'chapter']),
    region: findColIndex(headers, ['region', 'province']),
    ban: findColIndex(headers, ['ban', 'ban name', 'team', 'ban name / team']),
    duty: findColIndex(headers, ['duty', 'title', 'position']),
    role: findColIndex(headers, ['role', 'roles', 'access']),
    contact: findColIndex(headers, ['contact', 'contact number', 'phone', 'mobile']),
    email: findColIndex(headers, ['email', 'email address', 'mail']),
  };

  if (colIndex.name === -1) {
    return {
      rows: [],
      errors: ['Required column "Name" was not found in the CSV header.'],
      areaSummary: {},
    };
  }

  const workingExistingCodes = [...existingCodes];
  const parsedRows: CsvMemberRow[] = [];
  const errors: string[] = [];
  const areaSummary: Record<string, number> = {};

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine.trim()) continue;

    const values = parseCsvLine(rawLine);
    const name = colIndex.name !== -1 && values[colIndex.name] ? values[colIndex.name].trim() : '';
    const area = colIndex.area !== -1 && values[colIndex.area] ? values[colIndex.area].trim() : 'Manila';
    const serial = colIndex.serial !== -1 && values[colIndex.serial] ? values[colIndex.serial].trim() : '';
    const department = colIndex.department !== -1 && values[colIndex.department] ? values[colIndex.department].trim() : 'Evangelism Dept';
    const section = colIndex.section !== -1 && values[colIndex.section] ? values[colIndex.section].trim() : 'Section Alpha';
    const region = colIndex.region !== -1 && values[colIndex.region] ? values[colIndex.region].trim() : 'NCR & Luzon';
    const ban = colIndex.ban !== -1 && values[colIndex.ban] ? values[colIndex.ban].trim() : 'Ban 1';
    const duty = colIndex.duty !== -1 && values[colIndex.duty] ? values[colIndex.duty].trim() : 'Evangelism Worker';
    const role = colIndex.role !== -1 && values[colIndex.role] ? values[colIndex.role].trim() : 'Member';
    const contact = colIndex.contact !== -1 && values[colIndex.contact] ? values[colIndex.contact].trim() : undefined;
    const email = colIndex.email !== -1 && values[colIndex.email] ? values[colIndex.email].trim() : undefined;

    if (!name) {
      errors.push(`Row ${i + 1}: Skipped because Member Name is empty.`);
      continue;
    }

    // Generate unique code in {Area}{Sequential4DigitNumber} format (e.g. MANILA0001, CEBU0042)
    const generatedCode = generateNextAreaReferralCode(area, workingExistingCodes);
    workingExistingCodes.push(generatedCode);

    const normArea = normalizeAreaPrefix(area);
    areaSummary[normArea] = (areaSummary[normArea] || 0) + 1;

    parsedRows.push({
      name,
      serial_number: serial || generateSerialNumberFromReferralCode(generatedCode),
      generated_referral_code: generatedCode,
      area,
      department,
      section,
      region,
      ban: ban || 'Ban 1',
      duty,
      role,
      contact_number: contact,
      email,
      team_leader: 'Leader Timothy',
      isValid: true,
    });
  }

  return { rows: parsedRows, errors, areaSummary };
}

function findColIndex(headers: string[], candidates: string[]): number {
  return headers.findIndex((h) => candidates.includes(h.toLowerCase().trim()));
}

function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((c === ',' || c === ';') && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

/**
 * Standard CSV Template matching exact requested columns:
 * Serial, Name, Department, Section, Area, Region, Ban, Duty, Role
 */
export const SAMPLE_MEMBER_CSV = `Serial,Name,Department,Section,Area,Region,Ban,Duty,Role
00361228-01771,Super Admin Overseer,HQ Management,Executive,National HQ,NCR & Luzon,Executive Ban,General Director,Super Admin
2026-MNL-001,Brother Gabriel Santos,Evangelism Dept,Section Alpha,Manila,NCR & Luzon,Ban 1,Evangelism Worker,Member
2026-MNL-002,Sister Chloe Hernandez,Evangelism Dept,Section Alpha,Manila,NCR & Luzon,Ban 1,Evangelism Worker,Member
2026-CEB-001,Brother Raphael Cruz,Evangelism Dept,Section Beta,Cebu,Visayas,Ban 2,Evangelism Worker,Member
2026-CEB-002,Sister Deborah Lim,Education Dept,BB Department,Cebu,Visayas,Ban 2,BB Teacher,BB Gyo-gwan
2026-DAV-001,Brother Matthew Villanueva,Evangelism Dept,Section Gamma,Davao,Mindanao,Ban 3,Section Leader,Section Leader
2026-CAV-001,Sister Priscilla Aquino,Evangelism Dept,Section Delta,Cavite,Luzon,Ban 1,Evangelism Worker,Member`;
