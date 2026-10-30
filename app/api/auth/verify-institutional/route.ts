import { NextRequest, NextResponse } from 'next/server';
import { getInstitutionalRegionDetails, isValidEmail } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const { email, institution, name } = await req.json();

    if (!email || !name) {
      return NextResponse.json({ error: 'Add a name and an email address.' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'That email address is not valid.' }, { status: 400 });
    }

    const regionInfo = getInstitutionalRegionDetails(email);

    if (!regionInfo.isAcademic) {
      return NextResponse.json(
        {
          error:
            'That address is not on a recognised academic domain. Use an address ending in .edu, .edu.bd, .ac.uk, or .edu.au.',
          domain: regionInfo.domain,
        },
        { status: 422 }
      );
    }

    const verificationToken = `attest_${regionInfo.countryCode.toLowerCase()}_${Buffer.from(email).toString('base64url').slice(0, 16)}_${Date.now()}`;

    return NextResponse.json({
      verified: true,
      email,
      name,
      institution: institution || regionInfo.regionLabel,
      countryCode: regionInfo.countryCode,
      countryName: regionInfo.countryName,
      regionLabel: regionInfo.regionLabel,
      domain: regionInfo.domain,
      verificationToken,
      grantedRole: 'author',
      permissions: ['write:post', 'upload:artifact', 'publish:review', 'access:writer-studio'],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'The academic domain check did not complete.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
