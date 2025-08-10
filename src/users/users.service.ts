import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

export type Role = 'ORANG_TUA' | 'PEGAWAI' | 'DOKTER' | 'ADMIN';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true },
    });
  }

  async findById(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateRole(id: number, newRole: Role) {
    await this.findById(id);
    return this.prisma.user.update({
      where: { id },
      data: { role: newRole },
      select: { id: true, email: true, name: true, role: true },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async getChildrenByParentId(parentId: number) {
    return this.prisma.child.findMany({
      where: { userId: parentId },
      select: {
        id: true,
        name: true,
        dob: true,
        nik: true,
        gender: true,
      },
      orderBy: { id: 'asc' },
    });
  }
}
