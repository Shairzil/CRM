import { Controller, Get, Post, Patch, Body, Query, Param, ParseIntPipe, Res, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { CreateStudentInfoDto } from './dto/create-student-info.dto';
import { Student } from '../entities/student.entity';
import { StudentInfo } from '../entities/student-info.entity';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post('info')
  async createInfo(@Body() createStudentInfoDto: CreateStudentInfoDto): Promise<StudentInfo> {
    return this.studentsService.createInfo(createStudentInfoDto);
  }

  @Get('info')
  async findAllInfo(@Query('name') name?: string): Promise<StudentInfo[]> {
    return this.studentsService.findAllInfo(name);
  }

  @Get('info/:id')
  async findOneInfo(@Param('id', ParseIntPipe) id: number): Promise<StudentInfo> {
    return this.studentsService.findOneInfo(id);
  }

  @Get('info/:id/cv')
  async getInfoCv(@Param('id', ParseIntPipe) id: number, @Res() res: any) {
    const info = await this.studentsService.findOneInfoWithCv(id);
    if (!info || !info.cv_data) {
      return res.status(404).send('CV not found.');
    }
    res.set({
      'Content-Type': info.cv_mime || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${info.cv_name || 'cv'}"`,
    });
    res.send(info.cv_data);
  }

  @Post('info/:id/cv')
  @UseInterceptors(FileInterceptor('file'))
  async uploadInfoCv(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.studentsService.updateInfoCv(id, file);
  }

  @Post()
  async create(@Body() createStudentDto: CreateStudentDto): Promise<Student> {
    return this.studentsService.create(createStudentDto);
  }

  @Get()
  async findAll(
    @Query('name') name?: string,
    @Query('invoice_id') invoiceId?: string,
  ): Promise<any[]> {
    return this.studentsService.findAll(name, invoiceId);
  }

  @Get('summary')
  async summary() {
    return this.studentsService.summary();
  }

  @Get('performance-dashboard')
  async getPerformanceDashboard(@Query('month') month?: string): Promise<any> {
    return this.studentsService.getPerformanceDashboard(month);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return this.studentsService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStudentDto: UpdateStudentDto,
  ): Promise<Student> {
    return this.studentsService.update(id, updateStudentDto);
  }

  @Get(':id/cv')
  async getStudentCv(@Param('id', ParseIntPipe) id: number, @Res() res: any) {
    const student = await this.studentsService.findOneWithCv(id);
    if (!student || !student.cv_data) {
      return res.status(404).send('CV not found.');
    }
    res.set({
      'Content-Type': student.cv_mime || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${student.cv_name || 'cv'}"`,
    });
    res.send(student.cv_data);
  }

  @Post(':id/cv')
  @UseInterceptors(FileInterceptor('file'))
  async uploadStudentCv(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.studentsService.updateStudentCv(id, file);
  }
}
