import { NextResponse } from 'next/server';

export const runtime = 'edge';

export interface NHTSAComplaint {
  odiNumber: number;
  crash: boolean;
  fire: boolean;
  numberOfInjuries: number;
  numberOfDeaths: number;
  dateOfIncident: string;
  dateComplaintFiled: string;
  components: string;
  summary: string;
  products: Array<{ productYear: string; productMake: string; productModel: string }>;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const make = searchParams.get('make');
  const model = searchParams.get('model');
  const yearsParam = searchParams.get('years');

  if (!make || !model) {
    return NextResponse.json({ error: 'Missing make or model' }, { status: 400 });
  }

  const years = yearsParam
    ? yearsParam.split(',').map(Number).filter(y => y > 1990).slice(0, 6)
    : [];

  if (years.length === 0) {
    return NextResponse.json({ complaints: [], total: 0, available: false });
  }

  try {
    const results = await Promise.all(
      years.map(year =>
        fetch(
          `https://api.nhtsa.gov/complaints/complaintsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${year}`,
          { signal: AbortSignal.timeout(8000) }
        )
          .then(r => r.json())
          .then(d => (d.results ?? []) as NHTSAComplaint[])
          .catch(() => [] as NHTSAComplaint[])
      )
    );

    // Merge and deduplicate by odiNumber
    const seen = new Set<number>();
    const complaints: NHTSAComplaint[] = [];
    for (const batch of results) {
      for (const c of batch) {
        if (!seen.has(c.odiNumber)) {
          seen.add(c.odiNumber);
          complaints.push(c);
        }
      }
    }

    // Sort newest first
    complaints.sort(
      (a, b) => new Date(b.dateComplaintFiled).getTime() - new Date(a.dateComplaintFiled).getTime()
    );

    return NextResponse.json({
      complaints,
      total: complaints.length,
      available: true,
    });
  } catch {
    return NextResponse.json({ complaints: [], total: 0, available: false });
  }
}
