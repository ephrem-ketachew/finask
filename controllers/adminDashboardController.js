import catchAsync from '../utils/catchAsync.js';
import User from '../models/userModel.js';
import University from '../models/universityModel.js';
import City from '../models/cityModel.js';
import Program from '../models/programModel.js';
import Celebrity from '../models/celebrityModel.js';
import Campus from '../models/campusModel.js';
import Question from '../models/questionModel.js';
import Review from '../models/reviewModel.js';

const MONTHS_BACK = 12;

function getMonthBuckets() {
  const buckets = [];
  const now = new Date();
  for (let i = MONTHS_BACK - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('en-US', {
      month: 'short',
      year: '2-digit',
    });
    buckets.push({ key, label, start: date });
  }
  return buckets;
}

function aggregateByMonth(docs, dateField = 'createdAt') {
  const buckets = getMonthBuckets();
  const counts = Object.fromEntries(buckets.map((b) => [b.key, 0]));

  for (const doc of docs) {
    const raw = doc[dateField];
    if (!raw) continue;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) continue;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (counts[key] !== undefined) counts[key]++;
  }

  return buckets.map((b) => ({
    month: b.label,
    monthKey: b.key,
    count: counts[b.key],
  }));
}

function mergeGrowthSeries(seriesList) {
  const buckets = getMonthBuckets();
  const keys = buckets.map((b) => b.key);

  return buckets.map((bucket, index) => {
    const point = { month: bucket.label, monthKey: bucket.key };
    for (const series of seriesList) {
      point[series.name] = series.data[index]?.count ?? 0;
    }
    return point;
  });
}

export const getAdminDashboardStats = catchAsync(async (req, res) => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    universities,
    cities,
    programs,
    celebrities,
    campuses,
    questions,
    reviews,
    users,
    activeUsers,
    verifiedUsers,
    adminUsers,
    featuredUniversities,
    recentUsers,
    recentQuestions,
    recentReviews,
    usersCreatedDates,
    universitiesCreatedDates,
    programsCreatedDates,
    questionsCreatedDates,
    usersByRole,
    usersByStatus,
    topUniversities,
  ] = await Promise.all([
    University.countDocuments(),
    City.countDocuments(),
    Program.countDocuments(),
    Celebrity.countDocuments(),
    Campus.countDocuments(),
    Question.countDocuments(),
    Review.countDocuments(),
    User.countDocuments(),
    User.countDocuments({ active: { $ne: false } }),
    User.countDocuments({ isVerified: true }),
    User.countDocuments({ role: 'admin' }),
    University.countDocuments({ isFeatured: true }),
    User.find()
      .sort('-createdAt')
      .limit(6)
      .select('firstName lastName email profileImage role createdAt isVerified active'),
    Question.find()
      .sort('-createdAt')
      .limit(6)
      .select('question onModelType createdAt'),
    Review.find()
      .sort('-createdAt')
      .limit(6)
      .select('review rating createdAt onModelType'),
    User.find().select('createdAt').lean(),
    University.find().select('createdAt').lean(),
    Program.find().select('createdAt').lean(),
    Question.find().select('createdAt').lean(),
    User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    User.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    University.find()
      .sort('-ratingsAverage -questionCount -createdAt')
      .limit(5)
      .select('name slug ratingsAverage questionCount coverImage isFeatured'),
  ]);

  const newUsersThisMonth = await User.countDocuments({
    createdAt: { $gte: startOfMonth },
  });

  const userGrowth = aggregateByMonth(usersCreatedDates);
  const universityGrowth = aggregateByMonth(universitiesCreatedDates);
  const programGrowth = aggregateByMonth(programsCreatedDates);
  const questionGrowth = aggregateByMonth(questionsCreatedDates);

  const growthChart = mergeGrowthSeries([
    { name: 'users', data: userGrowth },
    { name: 'universities', data: universityGrowth },
    { name: 'programs', data: programGrowth },
    { name: 'questions', data: questionGrowth },
  ]);

  const contentDistribution = [
    { key: 'universities', label: 'Universities', count: universities },
    { key: 'programs', label: 'Programs', count: programs },
    { key: 'cities', label: 'Cities', count: cities },
    { key: 'campuses', label: 'Campuses', count: campuses },
    { key: 'celebrities', label: 'Great Minds', count: celebrities },
  ].filter((item) => item.count > 0);

  const totalContent = contentDistribution.reduce(
    (sum, item) => sum + item.count,
    0
  );

  const roleLabels = {
    user: 'Users',
    admin: 'Admins',
    moderator: 'Moderators',
    university_manager: 'University Managers',
  };

  const statusLabels = {
    'high-school-student': 'High School',
    'university-student': 'University Student',
    'recent-graduate': 'Recent Graduate',
    'working-professional': 'Working Professional',
    lecturer: 'Lecturer',
    teacher: 'Teacher',
    entrepreneur: 'Entrepreneur',
    freelancer: 'Freelancer',
    'seeking-opportunities': 'Seeking Opportunities',
    parent: 'Parent',
    'taking-a-gap-year': 'Gap Year',
    other: 'Other',
  };

  res.status(200).json({
    status: 'success',
    data: {
      overview: {
        universities,
        cities,
        programs,
        celebrities,
        campuses,
        questions,
        reviews,
        users,
        activeUsers,
        verifiedUsers,
        adminUsers,
        featuredUniversities,
        newUsersThisMonth,
      },
      growthChart,
      contentDistribution: contentDistribution.map((item) => ({
        ...item,
        percentage:
          totalContent > 0
            ? Math.round((item.count / totalContent) * 100)
            : 0,
      })),
      usersByRole: usersByRole.map((row) => ({
        role: row._id,
        label: roleLabels[row._id] ?? row._id,
        count: row.count,
      })),
      usersByStatus: usersByStatus.map((row) => ({
        status: row._id,
        label: statusLabels[row._id] ?? row._id,
        count: row.count,
      })),
      recentUsers: recentUsers.map((user) => ({
        id: user._id,
        name: user.fullName ?? `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        profileImage: user.profileImage,
        role: user.role,
        isVerified: user.isVerified,
        active: user.active !== false,
        createdAt: user.createdAt,
      })),
      recentQuestions: recentQuestions.map((q) => ({
        id: q._id,
        question: q.question,
        onModelType: q.onModelType,
        createdAt: q.createdAt,
      })),
      recentReviews: recentReviews.map((r) => ({
        id: r._id,
        review: r.review,
        rating: r.rating,
        onModelType: r.onModelType,
        createdAt: r.createdAt,
      })),
      topUniversities: topUniversities.map((u) => ({
        id: u._id,
        name: u.name,
        slug: u.slug,
        coverImage: u.coverImage,
        ratingsAverage: u.ratingsAverage,
        questionCount: u.questionCount ?? 0,
        isFeatured: u.isFeatured ?? false,
      })),
    },
  });
});
