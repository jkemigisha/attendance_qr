import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, Users, GraduationCap, BookOpen, ClipboardList, Plus, Trash2, Search, Printer, Download, Filter, FileText } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import EditStudentDialog from "./EditStudentDialog";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("lecturers");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [newCourse, setNewCourse] = useState({ course_code: "", course_name: "", department: "" });
  const [editingStudent, setEditingStudent] = useState<any>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [lecRes, stuRes, courseRes, attRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("role", "lecturer").order("full_name"),
      supabase.from("profiles").select("*").eq("role", "student").order("full_name"),
      supabase.from("courses").select("*").order("course_code"),
      supabase
        .from("attendance")
        .select("*, profiles!attendance_student_id_fkey(full_name, student_id, department), lectures!attendance_lecture_id_fkey(title, course_code, course_name, venue, scheduled_time)")
        .order("marked_at", { ascending: false })
        .limit(200),
    ]);

    if (lecRes.data) setLecturers(lecRes.data);
    if (stuRes.data) setStudents(stuRes.data);
    if (courseRes.data) setCourses(courseRes.data);
    if (attRes.data) setAttendance(attRes.data);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleDeleteProfile = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete: " + error.message);
    } else {
      toast.success("Deleted successfully");
      fetchAll();
    }
  };

  const handleAddCourse = async () => {
    if (!newCourse.course_code || !newCourse.course_name) {
      toast.error("Course code and name are required");
      return;
    }
    const { error } = await supabase.from("courses").insert(newCourse);
    if (error) {
      toast.error("Failed to add course: " + error.message);
    } else {
      toast.success("Course added");
      setNewCourse({ course_code: "", course_name: "", department: "" });
      setCourseDialogOpen(false);
      fetchAll();
    }
  };

  const handleDeleteCourse = async (id: string, name: string) => {
    if (!confirm(`Delete course ${name}?`)) return;
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete: " + error.message);
    } else {
      toast.success("Course deleted");
      fetchAll();
    }
  };

  // Compute unique departments from all data sources
  const departments = useMemo(() => {
    const deptSet = new Set<string>();
    lecturers.forEach((l) => l.department && deptSet.add(l.department));
    students.forEach((s) => s.department && deptSet.add(s.department));
    courses.forEach((c) => c.department && deptSet.add(c.department));
    return Array.from(deptSet).sort();
  }, [lecturers, students, courses]);

  // Filter data by selected department
  const filteredLecturers = useMemo(() => {
    if (departmentFilter === "all") return lecturers;
    return lecturers.filter((l) => l.department === departmentFilter);
  }, [lecturers, departmentFilter]);

  const filteredStudents = useMemo(() => {
    if (departmentFilter === "all") return students;
    return students.filter((s) => s.department === departmentFilter);
  }, [students, departmentFilter]);

  const filteredCourses = useMemo(() => {
    if (departmentFilter === "all") return courses;
    return courses.filter((c) => c.department === departmentFilter);
  }, [courses, departmentFilter]);

  const filteredAttendance = attendance.filter((a) => {
    const matchesDept = departmentFilter === "all" || a.profiles?.department === departmentFilter;
    if (!matchesDept) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      a.profiles?.full_name?.toLowerCase().includes(term) ||
      a.profiles?.student_id?.toLowerCase().includes(term) ||
      a.lectures?.course_code?.toLowerCase().includes(term) ||
      a.lectures?.title?.toLowerCase().includes(term)
    );
  });

  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const csvContent = [headers.join(","), ...rows.map((r) => r.map((c) => `"${(c || "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("CSV Report downloaded");
  };

  const downloadPDF = (title: string, filename: string, headers: string[], rows: string[][]) => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text(title, 14, 15);
    
    // Add date
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}`, 14, 22);
    
    // Add table
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 28,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });
    
    doc.save(`${filename}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("PDF Report downloaded");
  };

  const printReport = (title: string, headers: string[], rows: string[][]) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) { toast.error("Pop-up blocked. Please allow pop-ups."); return; }
    printWindow.document.write(`
      <html><head><title>${title} - UCU Attendance System</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        p { color: #666; font-size: 12px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f5f5f5; font-weight: 600; }
        tr:nth-child(even) { background: #fafafa; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <h1>${title}</h1>
      <p>Generated on ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")} — UCU Attendance System</p>
      <table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c || "—"}</td>`).join("")}</tr>`).join("")}</tbody></table>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const exportLecturers = () => {
    const headers = ["Name", "Email", "Department", "Joined"];
    const rows = filteredLecturers.map((l) => [l.full_name, l.email, l.department || "", format(new Date(l.created_at), "MMM d, yyyy")]);
    return { headers, rows };
  };

  const exportStudents = () => {
    const headers = ["Name", "Student ID", "Email", "Department", "Joined"];
    const rows = filteredStudents.map((s) => [s.full_name, s.student_id || "", s.email, s.department || "", format(new Date(s.created_at), "MMM d, yyyy")]);
    return { headers, rows };
  };

  const exportCourses = () => {
    const headers = ["Code", "Name", "Department"];
    const rows = filteredCourses.map((c) => [c.course_code, c.course_name, c.department || ""]);
    return { headers, rows };
  };

  const exportAttendance = () => {
    const headers = ["Student", "Student ID", "Course", "Lecture", "Venue", "Marked At"];
    const rows = filteredAttendance.map((a) => [
      a.profiles?.full_name || "", a.profiles?.student_id || "", a.lectures?.course_code || "",
      a.lectures?.title || "", a.lectures?.venue || "", format(new Date(a.marked_at), "MMM d, yyyy h:mm a"),
    ]);
    return { headers, rows };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Manage the UCU Attendance System</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={handleSignOut} className="gap-2">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Stats */}
        {departmentFilter !== "all" && (
          <div className="flex items-center gap-2 px-1">
            <span className="text-sm text-muted-foreground">Filtering by:</span>
            <span className="text-sm font-semibold text-primary">{departmentFilter}</span>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setDepartmentFilter("all")}>
              Clear
            </Button>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="shadow-card cursor-pointer hover:border-primary/50 hover:shadow-md transition-all" onClick={() => setActiveTab("lecturers")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Lecturers</CardTitle>
              <GraduationCap className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{filteredLecturers.length}</div>
            </CardContent>
          </Card>
          <Card className="shadow-card cursor-pointer hover:border-primary/50 hover:shadow-md transition-all" onClick={() => setActiveTab("students")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Students</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{filteredStudents.length}</div>
            </CardContent>
          </Card>
          <Card className="shadow-card cursor-pointer hover:border-primary/50 hover:shadow-md transition-all" onClick={() => setActiveTab("courses")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Courses</CardTitle>
              <BookOpen className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{filteredCourses.length}</div>
            </CardContent>
          </Card>
          <Card className="shadow-card cursor-pointer hover:border-primary/50 hover:shadow-md transition-all" onClick={() => setActiveTab("attendance")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Attendance Records</CardTitle>
              <ClipboardList className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{filteredAttendance.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="lecturers">Lecturers</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
          </TabsList>

          {/* Lecturers Tab */}
          <TabsContent value="lecturers">
            <Card>
               <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Lecturers</CardTitle>
                    <CardDescription>All registered lecturers</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => { const { headers, rows } = exportLecturers(); printReport("Lecturers Report", headers, rows); }}>
                      <Printer className="w-4 h-4" /> Print
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => { const { headers, rows } = exportLecturers(); downloadCSV("lecturers", headers, rows); }}>
                      <Download className="w-4 h-4" /> CSV
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => { const { headers, rows } = exportLecturers(); downloadPDF("Lecturers Report", "lecturers", headers, rows); }}>
                      <FileText className="w-4 h-4" /> PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="w-16">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLecturers.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">{l.full_name}</TableCell>
                        <TableCell>{l.email}</TableCell>
                        <TableCell>{l.department || "—"}</TableCell>
                        <TableCell>{format(new Date(l.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteProfile(l.id, l.full_name)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredLecturers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No lecturers found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students">
            <Card>
               <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Students</CardTitle>
                    <CardDescription>All registered students</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => { const { headers, rows } = exportStudents(); printReport("Students Report", headers, rows); }}>
                      <Printer className="w-4 h-4" /> Print
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => { const { headers, rows } = exportStudents(); downloadCSV("students", headers, rows); }}>
                      <Download className="w-4 h-4" /> CSV
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => { const { headers, rows } = exportStudents(); downloadPDF("Students Report", "students", headers, rows); }}>
                      <FileText className="w-4 h-4" /> PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="w-16">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.full_name}</TableCell>
                        <TableCell>{s.student_id || "—"}</TableCell>
                        <TableCell>{s.email}</TableCell>
                        <TableCell>{s.department || "—"}</TableCell>
                        <TableCell>{format(new Date(s.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setEditingStudent(s)}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-primary"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteProfile(s.id, s.full_name)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredStudents.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No students found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses">
            <Card>
              <CardHeader>
                 <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Courses</CardTitle>
                    <CardDescription>Manage university courses</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => { const { headers, rows } = exportCourses(); printReport("Courses Report", headers, rows); }}>
                      <Printer className="w-4 h-4" /> Print
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => { const { headers, rows } = exportCourses(); downloadCSV("courses", headers, rows); }}>
                      <Download className="w-4 h-4" /> CSV
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => { const { headers, rows } = exportCourses(); downloadPDF("Courses Report", "courses", headers, rows); }}>
                      <FileText className="w-4 h-4" /> PDF
                    </Button>
                  <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="gap-2">
                        <Plus className="w-4 h-4" /> Add Course
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Course</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Course Code</Label>
                          <Input
                            placeholder="CS101"
                            value={newCourse.course_code}
                            onChange={(e) => setNewCourse({ ...newCourse, course_code: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Course Name</Label>
                          <Input
                            placeholder="Introduction to Computer Science"
                            value={newCourse.course_name}
                            onChange={(e) => setNewCourse({ ...newCourse, course_name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Department</Label>
                          <Input
                            placeholder="Computer Science"
                            value={newCourse.department}
                            onChange={(e) => setNewCourse({ ...newCourse, department: e.target.value })}
                          />
                        </div>
                        <Button onClick={handleAddCourse} className="w-full">Add Course</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="w-16">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCourses.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.course_code}</TableCell>
                        <TableCell>{c.course_name}</TableCell>
                        <TableCell>{c.department || "—"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteCourse(c.id, c.course_name)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredCourses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No courses yet</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance">
            <Card>
               <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Attendance Records</CardTitle>
                    <CardDescription>View all attendance across all lectures</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => { const { headers, rows } = exportAttendance(); printReport("Attendance Report", headers, rows); }}>
                      <Printer className="w-4 h-4" /> Print
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => { const { headers, rows } = exportAttendance(); downloadCSV("attendance", headers, rows); }}>
                      <Download className="w-4 h-4" /> CSV
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => { const { headers, rows } = exportAttendance(); downloadPDF("Attendance Report", "attendance", headers, rows); }}>
                      <FileText className="w-4 h-4" /> PDF
                    </Button>
                  </div>
                </div>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, student ID, or course..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Lecture</TableHead>
                      <TableHead>Venue</TableHead>
                      <TableHead>Marked At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttendance.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.profiles?.full_name || "—"}</TableCell>
                        <TableCell>{a.profiles?.student_id || "—"}</TableCell>
                        <TableCell>{a.lectures?.course_code || "—"}</TableCell>
                        <TableCell>{a.lectures?.title || "—"}</TableCell>
                        <TableCell>{a.lectures?.venue || "—"}</TableCell>
                        <TableCell>{format(new Date(a.marked_at), "MMM d, yyyy h:mm a")}</TableCell>
                      </TableRow>
                    ))}
                    {filteredAttendance.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No records found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {editingStudent && (
          <EditStudentDialog
            student={editingStudent}
            open={!!editingStudent}
            onOpenChange={(open) => !open && setEditingStudent(null)}
            onUpdate={fetchAll}
          />
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
