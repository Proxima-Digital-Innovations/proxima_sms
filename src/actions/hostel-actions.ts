'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

export async function getHostelsSummary() {
  try {
    const [totalHostels, totalRooms, totalBeds, occupiedBeds, activeAllocations, hostels] = await Promise.all([
      prisma.hostel.count({ where: { status: 'ACTIVE' } }),
      prisma.hostelRoom.count(),
      prisma.hostelBedSpace.count(),
      prisma.hostelBedSpace.count({ where: { isOccupied: true } }),
      prisma.hostelAllocation.count({ where: { status: { in: ['ALLOCATED', 'CHECKED_IN'] } } }),
      prisma.hostel.findMany({
        select: {
          id: true,
          gender: true,
          rooms: {
            select: {
              capacity: true,
              bedSpaces: {
                select: { isOccupied: true }
              }
            }
          }
        }
      })
    ]);

    let maleTotalBeds = 0;
    let maleOccupiedBeds = 0;
    let femaleTotalBeds = 0;
    let femaleOccupiedBeds = 0;

    for (const h of hostels) {
      for (const r of h.rooms) {
        const bedCount = r.bedSpaces.length;
        const occCount = r.bedSpaces.filter(b => b.isOccupied).length;
        if (h.gender === 'MALE') {
          maleTotalBeds += bedCount;
          maleOccupiedBeds += occCount;
        } else if (h.gender === 'FEMALE') {
          femaleTotalBeds += bedCount;
          femaleOccupiedBeds += occCount;
        }
      }
    }

    return {
      success: true,
      data: {
        totalHostels,
        totalRooms,
        totalBeds,
        occupiedBeds,
        availableBeds: Math.max(0, totalBeds - occupiedBeds),
        occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
        activeAllocations,
        maleTotalBeds,
        maleOccupiedBeds,
        femaleTotalBeds,
        femaleOccupiedBeds,
      }
    };
  } catch (error: any) {
    console.error('Error fetching hostels summary:', error);
    return { success: false, error: error.message };
  }
}

export async function getHostelsList() {
  try {
    const hostels = await prisma.hostel.findMany({
      include: {
        campus: { select: { name: true, code: true } },
        _count: {
          select: {
            blocks: true,
            rooms: true,
            allocations: true,
          }
        },
        rooms: {
          select: {
            capacity: true,
            bedSpaces: {
              select: { isOccupied: true }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const formatted = hostels.map(h => {
      let totalBedSpaces = 0;
      let occupiedBedSpaces = 0;
      for (const r of h.rooms) {
        totalBedSpaces += r.bedSpaces.length;
        occupiedBedSpaces += r.bedSpaces.filter(b => b.isOccupied).length;
      }

      return {
        id: h.id,
        name: h.name,
        code: h.code,
        gender: h.gender,
        category: h.category,
        description: h.description,
        wardenName: h.wardenName,
        wardenPhone: h.wardenPhone,
        status: h.status,
        campusName: h.campus?.name || 'Main Campus',
        blocksCount: h._count.blocks,
        roomsCount: h._count.rooms,
        totalBedSpaces,
        occupiedBedSpaces,
        availableBedSpaces: Math.max(0, totalBedSpaces - occupiedBedSpaces),
        occupancyPercentage: totalBedSpaces > 0 ? Math.round((occupiedBedSpaces / totalBedSpaces) * 100) : 0,
      };
    });

    return { success: true, data: formatted };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getHostelDetails(hostelId: string) {
  try {
    const hostel = await prisma.hostel.findUnique({
      where: { id: hostelId },
      include: {
        campus: true,
        blocks: {
          orderBy: { name: 'asc' }
        },
        rooms: {
          include: {
            block: true,
            bedSpaces: {
              include: {
                allocations: {
                  where: { status: { in: ['ALLOCATED', 'CHECKED_IN'] } },
                  include: {
                    studentProfile: {
                      include: {
                        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
                        program: { select: { name: true, code: true } }
                      }
                    },
                    student: {
                      select: { firstName: true, lastName: true, studentId: true }
                    }
                  }
                }
              },
              orderBy: { bedNumber: 'asc' }
            }
          },
          orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }]
        }
      }
    });

    if (!hostel) {
      return { success: false, error: 'Hostel hall not found' };
    }

    return { success: true, data: hostel };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createHostel(data: {
  name: string;
  code: string;
  gender: string;
  campusId?: string;
  category?: string;
  description?: string;
  wardenName?: string;
  wardenPhone?: string;
  wardenEmail?: string;
}) {
  try {
    const existing = await prisma.hostel.findUnique({
      where: { code: data.code.trim().toUpperCase() }
    });
    if (existing) {
      return { success: false, error: `Hostel code "${data.code}" already exists.` };
    }

    const hostel = await prisma.hostel.create({
      data: {
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        gender: data.gender,
        campusId: data.campusId || null,
        category: data.category || 'UNDERGRADUATE',
        description: data.description,
        wardenName: data.wardenName,
        wardenPhone: data.wardenPhone,
        wardenEmail: data.wardenEmail,
        status: 'ACTIVE'
      }
    });

    revalidatePath('/dashboard/hostels');
    return { success: true, data: hostel };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createRoomsBatch(data: {
  hostelId: string;
  blockName?: string;
  floor: number;
  prefix: string;
  startNum: number;
  count: number;
  capacity: number;
  feePerSession: number;
  type?: string;
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      let blockId: string | null = null;
      if (data.blockName && data.blockName.trim()) {
        let block = await tx.hostelBlock.findFirst({
          where: { hostelId: data.hostelId, name: data.blockName.trim() }
        });
        if (!block) {
          block = await tx.hostelBlock.create({
            data: { hostelId: data.hostelId, name: data.blockName.trim(), floors: Math.max(1, data.floor + 1) }
          });
        }
        blockId = block.id;
      }

      const createdRooms: any[] = [];
      for (let i = 0; i < data.count; i++) {
        const num = data.startNum + i;
        const roomNumber = `${data.prefix ? data.prefix.trim() : ''}${num}`;

        // Upsert or create room
        const room = await tx.hostelRoom.upsert({
          where: { hostelId_roomNumber: { hostelId: data.hostelId, roomNumber } },
          update: {
            floor: data.floor,
            capacity: data.capacity,
            feePerSession: data.feePerSession,
            type: data.type || 'STANDARD',
            blockId,
          },
          create: {
            hostelId: data.hostelId,
            blockId,
            roomNumber,
            floor: data.floor,
            capacity: data.capacity,
            feePerSession: data.feePerSession,
            type: data.type || 'STANDARD',
            status: 'AVAILABLE'
          }
        });

        // Generate Bedspaces
        for (let b = 1; b <= data.capacity; b++) {
          const bedLabel = data.capacity > 2 
            ? `Bed ${b} (${b % 2 !== 0 ? 'Lower' : 'Upper'} Bunk)`
            : `Bed ${b}`;

          await tx.hostelBedSpace.upsert({
            where: { roomId_bedNumber: { roomId: room.id, bedNumber: bedLabel } },
            update: {},
            create: {
              roomId: room.id,
              bedNumber: bedLabel,
              isOccupied: false,
              status: 'AVAILABLE'
            }
          });
        }

        createdRooms.push(room);
      }

      revalidatePath(`/dashboard/hostels/${data.hostelId}`);
      revalidatePath('/dashboard/hostels');
      return { success: true, count: createdRooms.length };
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function allocateBedspace(data: {
  hostelId: string;
  roomId: string;
  bedSpaceId: string;
  studentProfileId?: string;
  studentId?: string;
  academicSessionId?: string;
  keyTag?: string;
  inventoryNotes?: string;
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Concurrency Check: verify bedspace is available
      const bed = await tx.hostelBedSpace.findUnique({
        where: { id: data.bedSpaceId },
        include: { room: true }
      });

      if (!bed) {
        throw new Error('Bedspace not found.');
      }

      if (bed.isOccupied || bed.status !== 'AVAILABLE') {
        throw new Error('This bedspace has already been allocated or is currently unavailable.');
      }

      // 2. Prevent duplicate active allocation for the same student
      if (data.studentProfileId) {
        const existing = await tx.hostelAllocation.findFirst({
          where: {
            studentProfileId: data.studentProfileId,
            status: { in: ['ALLOCATED', 'CHECKED_IN'] }
          }
        });
        if (existing) {
          throw new Error('This student already has an active bedspace allocation in the system.');
        }
      }

      // 3. Create allocation
      const refNumber = `HA-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const qrToken = `SEC-HOSTEL-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

      const allocation = await tx.hostelAllocation.create({
        data: {
          allocationRef: refNumber,
          academicSessionId: data.academicSessionId || null,
          hostelId: data.hostelId,
          roomId: data.roomId,
          bedSpaceId: data.bedSpaceId,
          studentProfileId: data.studentProfileId || null,
          studentId: data.studentId || null,
          status: 'ALLOCATED',
          allocatedAt: new Date(),
          keyTag: data.keyTag || null,
          inventoryNotes: data.inventoryNotes || 'Standard mattress, wardrobe key, and study station issued in good condition.',
          qrToken,
        }
      });

      // 4. Mark bedspace occupied
      await tx.hostelBedSpace.update({
        where: { id: data.bedSpaceId },
        data: { isOccupied: true, status: 'OCCUPIED' }
      });

      // 5. Update room status if full
      const remainingEmptyBeds = await tx.hostelBedSpace.count({
        where: { roomId: data.roomId, isOccupied: false }
      });

      if (remainingEmptyBeds === 0) {
        await tx.hostelRoom.update({
          where: { id: data.roomId },
          data: { status: 'FULL' }
        });
      }

      revalidatePath('/dashboard/hostels');
      revalidatePath(`/dashboard/hostels/${data.hostelId}`);
      revalidatePath('/dashboard/hostels/allocations');

      return { success: true, data: allocation };
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function checkInStudent(allocationId: string, data: { porterName: string; keyTag?: string; inventoryNotes?: string }) {
  try {
    const allocation = await prisma.hostelAllocation.update({
      where: { id: allocationId },
      data: {
        status: 'CHECKED_IN',
        checkedInAt: new Date(),
        checkedInBy: data.porterName,
        keyTag: data.keyTag || undefined,
        inventoryNotes: data.inventoryNotes || undefined,
      }
    });

    revalidatePath('/dashboard/hostels/allocations');
    return { success: true, data: allocation };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function checkOutStudent(allocationId: string, data: { porterName: string; clearanceNotes?: string }) {
  try {
    return await prisma.$transaction(async (tx) => {
      const alloc = await tx.hostelAllocation.findUnique({
        where: { id: allocationId },
        include: { bedSpace: true, room: true }
      });

      if (!alloc) throw new Error('Allocation record not found.');

      await tx.hostelAllocation.update({
        where: { id: allocationId },
        data: {
          status: 'CHECKED_OUT',
          checkedOutAt: new Date(),
          checkedOutBy: data.porterName,
          clearanceNotes: data.clearanceNotes || 'Room key returned and fixtures inspected with no damages.',
        }
      });

      // Free bedspace
      await tx.hostelBedSpace.update({
        where: { id: alloc.bedSpaceId },
        data: { isOccupied: false, status: 'AVAILABLE' }
      });

      // Mark room available
      await tx.hostelRoom.update({
        where: { id: alloc.roomId },
        data: { status: 'AVAILABLE' }
      });

      revalidatePath('/dashboard/hostels');
      revalidatePath('/dashboard/hostels/allocations');
      return { success: true };
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAllocationsList(filter?: { hostelId?: string; status?: string; search?: string }) {
  try {
    const where: any = {};
    if (filter?.hostelId && filter.hostelId !== 'ALL') {
      where.hostelId = filter.hostelId;
    }
    if (filter?.status && filter.status !== 'ALL') {
      where.status = filter.status;
    }

    const allocations = await prisma.hostelAllocation.findMany({
      where,
      include: {
        hostel: { select: { name: true, code: true, gender: true } },
        room: { select: { roomNumber: true, floor: true, type: true } },
        bedSpace: { select: { bedNumber: true } },
        studentProfile: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, phone: true } },
            program: { select: { name: true, code: true } }
          }
        },
        student: {
          select: { firstName: true, lastName: true, studentId: true }
        }
      },
      orderBy: { allocatedAt: 'desc' },
      take: 200,
    });

    return { success: true, data: allocations };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getStudentsForAllocationSearch(search: string) {
  try {
    if (!search || search.trim().length < 2) return { success: true, data: [] };
    const query = search.trim();

    const students = await prisma.studentProfile.findMany({
      where: {
        OR: [
          { matricNumber: { contains: query } },
          { user: { firstName: { contains: query } } },
          { user: { lastName: { contains: query } } },
          { user: { email: { contains: query } } },
        ]
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
        program: { select: { name: true, code: true } }
      },
      take: 15,
    });

    const formatted = students.map(s => ({
      id: s.id,
      matricNumber: s.matricNumber,
      name: `${s.user.firstName} ${s.user.lastName}`,
      email: s.user.email,
      phone: s.user.phone,
      program: s.program?.name || 'General Studies',
      currentLevel: s.currentLevel,
    }));

    return { success: true, data: formatted };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAvailableBedspacesForBooking(filter?: { gender?: string }) {
  try {
    const whereHostel: any = { status: 'ACTIVE' };
    if (filter?.gender && filter.gender !== 'MIXED') {
      whereHostel.gender = { in: [filter.gender, 'MIXED'] };
    }

    const hostels = await prisma.hostel.findMany({
      where: whereHostel,
      include: {
        campus: { select: { name: true } },
        rooms: {
          where: { status: { not: 'FULL' } },
          include: {
            block: true,
            bedSpaces: {
              where: { isOccupied: false, status: 'AVAILABLE' }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const results = hostels
      .map(h => ({
        id: h.id,
        name: h.name,
        code: h.code,
        gender: h.gender,
        description: h.description,
        campus: h.campus?.name || 'Main Campus',
        rooms: h.rooms
          .filter(r => r.bedSpaces.length > 0)
          .map(r => ({
            id: r.id,
            roomNumber: r.roomNumber,
            floor: r.floor,
            type: r.type,
            feePerSession: r.feePerSession,
            availableBedsCount: r.bedSpaces.length,
            blockName: r.block?.name || 'Main Block',
            beds: r.bedSpaces.map(b => ({
              id: b.id,
              bedNumber: b.bedNumber,
            }))
          }))
      }))
      .filter(h => h.rooms.length > 0);

    return { success: true, data: results };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function seedSampleHostels() {
  try {
    const count = await prisma.hostel.count();
    if (count > 0) {
      return { success: true, message: 'Hostels already exist.', count };
    }

    // 1. Create Kenneth Dike Hall (Male)
    const dike = await prisma.hostel.create({
      data: {
        name: 'Prof. Kenneth Dike Hall',
        code: 'HL-DIKE',
        gender: 'MALE',
        category: 'UNDERGRADUATE',
        description: 'Undergraduate male residence with quiet study lounges, high-speed Wi-Fi, and 24/7 security.',
        wardenName: 'Dr. Michael Adebayo',
        wardenPhone: '+234 803 112 3344',
        wardenEmail: 'warden.dike@institution.edu.ng',
        status: 'ACTIVE'
      }
    });

    // Create Block A & Block B
    const blockA = await prisma.hostelBlock.create({
      data: { hostelId: dike.id, name: 'Block A (East Wing)', floors: 3 }
    });

    for (let r = 1; r <= 6; r++) {
      const room = await prisma.hostelRoom.create({
        data: {
          hostelId: dike.id,
          blockId: blockA.id,
          roomNumber: `A10${r}`,
          floor: 1,
          capacity: 4,
          feePerSession: 45000,
          type: 'STANDARD',
          status: 'AVAILABLE'
        }
      });
      for (let b = 1; b <= 4; b++) {
        await prisma.hostelBedSpace.create({
          data: {
            roomId: room.id,
            bedNumber: `Bed ${b} (${b % 2 !== 0 ? 'Lower' : 'Upper'} Bunk)`,
            isOccupied: false,
            status: 'AVAILABLE'
          }
        });
      }
    }

    // 2. Create Queen Moremi Hall (Female)
    const moremi = await prisma.hostel.create({
      data: {
        name: 'Queen Moremi Hall',
        code: 'HL-MOREMI',
        gender: 'FEMALE',
        category: 'UNDERGRADUATE',
        description: 'Premier undergraduate female hall of residence featuring solar water heating and biometric turnstiles.',
        wardenName: 'Prof. (Mrs) Fatima Bello',
        wardenPhone: '+234 802 889 0011',
        wardenEmail: 'warden.moremi@institution.edu.ng',
        status: 'ACTIVE'
      }
    });

    const blockM = await prisma.hostelBlock.create({
      data: { hostelId: moremi.id, name: 'Block 1', floors: 2 }
    });

    for (let r = 1; r <= 6; r++) {
      const room = await prisma.hostelRoom.create({
        data: {
          hostelId: moremi.id,
          blockId: blockM.id,
          roomNumber: `M20${r}`,
          floor: 2,
          capacity: 4,
          feePerSession: 50000,
          type: 'STANDARD',
          status: 'AVAILABLE'
        }
      });
      for (let b = 1; b <= 4; b++) {
        await prisma.hostelBedSpace.create({
          data: {
            roomId: room.id,
            bedNumber: `Bed ${b} (${b % 2 !== 0 ? 'Lower' : 'Upper'} Bunk)`,
            isOccupied: false,
            status: 'AVAILABLE'
          }
        });
      }
    }

    // 3. Create Emerald Executive Hall (Ensuite / Postgrad)
    const emerald = await prisma.hostel.create({
      data: {
        name: 'Emerald Executive Hall',
        code: 'HL-EMERALD',
        gender: 'MIXED',
        category: 'POSTGRADUATE',
        description: 'Executive 2-man self-contained apartments for postgraduates, clinical students, and scholars.',
        wardenName: 'Engr. David Okon',
        wardenPhone: '+234 805 776 2211',
        wardenEmail: 'warden.emerald@institution.edu.ng',
        status: 'ACTIVE'
      }
    });

    for (let r = 1; r <= 4; r++) {
      const room = await prisma.hostelRoom.create({
        data: {
          hostelId: emerald.id,
          roomNumber: `EX-0${r}`,
          floor: 1,
          capacity: 2,
          feePerSession: 120000,
          type: 'EXECUTIVE',
          status: 'AVAILABLE'
        }
      });
      for (let b = 1; b <= 2; b++) {
        await prisma.hostelBedSpace.create({
          data: {
            roomId: room.id,
            bedNumber: `Executive Suite Bed ${b}`,
            isOccupied: false,
            status: 'AVAILABLE'
          }
        });
      }
    }

    revalidatePath('/dashboard/hostels');
    return { success: true, message: 'Sample hostels seeded successfully.' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
