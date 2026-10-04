export function isCourseVisible(course, user, hasEnrollment = false) {
  return course.published !== false || hasEnrollment || ['Admin', 'Instructor'].includes(user?.role);
}