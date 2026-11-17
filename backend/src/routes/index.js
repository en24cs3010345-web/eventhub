const router = require('express').Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');
const { protect, optionalAuth, authorize } = require('../middleware/auth');
const auth = require('../controllers/authController');
const ev = require('../controllers/eventController');
const bk = require('../controllers/bookingController');
const pay = require('../controllers/paymentController');
const tk = require('../controllers/ticketController');
const dash = require('../controllers/dashboardController');
const admin = require('../controllers/adminController');

const id = (name = 'id') => param(name).isInt({ min: 1 }).withMessage('Invalid id');
const strongPw = (f) => body(f).isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  .matches(/[A-Za-z]/).withMessage('Password needs a letter').matches(/\d/).withMessage('Password needs a number');

// ---- Auth
router.post('/auth/register', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Enter your full name'),
  body('email').isEmail().withMessage('Enter a valid email').normalizeEmail(),
  body('phone').optional({ checkFalsy: true }).matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit Indian mobile number'),
  strongPw('password'), validate], auth.register);
router.post('/auth/login', [body('email').isEmail().withMessage('Enter a valid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Enter your password'), validate], auth.login);
router.get('/auth/me', protect, auth.me);
router.put('/auth/profile', protect, [body('name').trim().isLength({ min: 2 }).withMessage('Enter your name'),
  body('phone').optional({ checkFalsy: true }).matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit mobile number'), validate], auth.updateProfile);
router.put('/auth/password', protect, [body('currentPassword').notEmpty().withMessage('Enter your current password'), strongPw('newPassword'), validate], auth.changePassword);

// ---- Events
const eventRules = [
  body('title').trim().isLength({ min: 3, max: 180 }).withMessage('Title must be 3–180 characters'),
  body('description').trim().isLength({ min: 20 }).withMessage('Describe the event in at least 20 characters'),
  body('category_id').isInt({ min: 1 }).withMessage('Choose a category'),
  body('event_date').isISO8601().withMessage('Choose a date').custom((v) => new Date(v) >= new Date(new Date().toDateString())).withMessage('Date cannot be in the past'),
  body('event_time').matches(/^\d{2}:\d{2}/).withMessage('Choose a start time'),
  body('poster_url').optional({ checkFalsy: true }).isURL().withMessage('Poster must be a valid link'),
  body('venue.name').trim().notEmpty().withMessage('Venue name is required'),
  body('venue.address').trim().notEmpty().withMessage('Venue address is required'),
  body('venue.city').trim().notEmpty().withMessage('City is required'),
  body('venue.capacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
  body('ticket_types').isArray({ min: 1, max: 8 }).withMessage('Add at least one ticket type'),
  body('ticket_types.*.name').trim().notEmpty().withMessage('Ticket type needs a name'),
  body('ticket_types.*.price').isFloat({ min: 0 }).withMessage('Price must be 0 or more'),
];
router.get('/categories', ev.listCategories);
router.get('/events', ev.listEvents);
router.get('/events/cities', ev.getCities);
router.get('/events/mine', protect, authorize('organizer', 'admin'), ev.myEvents);
router.post('/events/upload-poster', protect, authorize('organizer', 'admin'), upload.single('poster'), ev.uploadPoster);
router.get('/events/:id', id(), validate, optionalAuth, ev.getEvent);
router.post('/events', protect, authorize('organizer', 'admin'), [...eventRules,
  body('ticket_types.*.quantity').if(body('is_seated').not().equals('true')).if((v, { req }) => !req.body.is_seated).isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('seat_config.rows').if((v, { req }) => req.body.is_seated).isInt({ min: 1, max: 26 }).withMessage('Rows must be 1–26'),
  body('seat_config.cols').if((v, { req }) => req.body.is_seated).isInt({ min: 1, max: 30 }).withMessage('Seats per row must be 1–30'),
  validate], ev.createEvent);
router.put('/events/:id', protect, authorize('organizer', 'admin'), [id(), ...eventRules, validate], ev.updateEvent);
router.delete('/events/:id', protect, authorize('organizer', 'admin'), [id(), validate], ev.deleteEvent);

// ---- Bookings
router.post('/bookings', protect, [
  body('event_id').isInt({ min: 1 }).withMessage('Invalid event'),
  body('items').optional().isArray(), body('items.*.ticket_type_id').optional().isInt({ min: 1 }),
  body('items.*.quantity').optional().isInt({ min: 1, max: 10 }).withMessage('Quantity must be 1–10'),
  body('seat_ids').optional().isArray(), validate], bk.createBooking);
router.get('/bookings', protect, bk.myBookings);
router.get('/bookings/:id', protect, [id(), validate], bk.getBooking);
router.post('/bookings/:id/cancel', protect, [id(), validate], bk.cancelBooking);

// ---- Payments
router.post('/payments/order', protect, [body('booking_id').isInt({ min: 1 }), validate], pay.createOrder);
router.post('/payments/verify', protect, [body('booking_id').isInt({ min: 1 }), body('razorpay_order_id').notEmpty(), validate], pay.verifyPayment);
router.get('/payments/:bookingId', protect, [id('bookingId'), validate], pay.paymentStatus);

// ---- Tickets
router.get('/tickets/booking/:bookingId', protect, [id('bookingId'), validate], tk.getTicket);
router.post('/tickets/verify', protect, authorize('organizer', 'admin'), [body('code').trim().notEmpty().withMessage('Enter a ticket code'), validate], tk.verifyTicket);

// ---- Organizer dashboard
router.get('/organizer/stats', protect, authorize('organizer', 'admin'), dash.organizerStats);
router.get('/organizer/bookings', protect, authorize('organizer', 'admin'), dash.organizerBookings);

// ---- Admin
const A = [protect, authorize('admin')];
router.get('/admin/stats', A, admin.stats);
router.get('/admin/users', A, admin.listUsers);
router.patch('/admin/users/:id', A, [id(), body('role').optional().isIn(['user', 'organizer', 'admin']), body('is_active').optional().isBoolean(), validate], admin.updateUser);
router.get('/admin/events', A, admin.listEvents);
router.patch('/admin/events/:id', A, [id(), body('status').optional().isIn(['pending', 'approved', 'rejected']), body('is_featured').optional().isBoolean(), validate], admin.moderateEvent);
router.get('/admin/bookings', A, admin.listBookings);
router.post('/admin/categories', A, [body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Enter a category name'), validate], admin.createCategory);
router.put('/admin/categories/:id', A, [id(), body('name').trim().isLength({ min: 2, max: 60 }), validate], admin.updateCategory);
router.delete('/admin/categories/:id', A, [id(), validate], admin.deleteCategory);

module.exports = router;
