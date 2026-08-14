import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const records = body.record; // Expected to match the albabello kiosk payload structure

    if (!records || !Array.isArray(records)) {
      return NextResponse.json({ status: false, message: 'Invalid payload' }, { status: 400 });
    }

    // In a real scenario, you'd use a kiosk token or session to get the .
    // Since the kiosk sends branch_id in the payload, we'll map that to (assuming it's passed as a string or mapped).
    // For this implementation, we assume `branch_id` is the `` (string).
    
    // According to albabello's ApiController, it processes sign-in (type=1) and sign-out (type=0)
    for (const record of records) {
      const {
        app_version,
        branch_id,
        device,
        location,
        staff_id,
        time_in,
        time_out,
        type,
      } = record;

      const dateStr = time_in ? new Date(time_in).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const parsedDate = new Date(dateStr);

      // Attempt to upsert the attendance log for this staff for this specific day
      // Our unique constraint is [staffId, date]
      
      const updateData: any = {
        type: type || 1,
        source: 'BAMS KIOSK',
      };

      if (time_in) updateData.timeIn = new Date(time_in).toISOString();
      if (time_out) updateData.timeOut = new Date(time_out).toISOString();

      const existingRecord = await prisma.staffAttendance.findFirst({
        where: {
          staffId: staff_id.toString(),
          date: parsedDate,
        }
      });

      if (existingRecord) {
        await prisma.staffAttendance.update({
          where: { id: existingRecord.id },
          data: updateData
        });
      } else {
        await prisma.staffAttendance.create({
          data: {
            staffId: staff_id.toString(),
            date: parsedDate,
            timeIn: time_in ? new Date(time_in).toISOString() : null,
            timeOut: time_out ? new Date(time_out).toISOString() : null,
            type: type || 1,
            source: 'BAMS KIOSK',
          }
        });
      }
    }

    return NextResponse.json({ status: true, message: 'Synced successfully' });
  } catch (error: any) {
    console.error('BAMS Sync Error:', error);
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
