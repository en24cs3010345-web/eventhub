import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import { Empty } from './components/ui';
import Home from './pages/Home';
import { Login, Register } from './pages/AuthPages';
import Events from './pages/Events';
import EventDetails from './pages/EventDetails';
import TicketSelection from './pages/TicketSelection';
import Checkout from './pages/Checkout';
import MyBookings from './pages/MyBookings';
import TicketView from './pages/TicketView';
import Profile from './pages/Profile';
import OrganizerDashboard from './pages/OrganizerDashboard';
import EventForm from './pages/EventForm';
import OrganizerBookings from './pages/OrganizerBookings';
import AdminDashboard from './pages/AdminDashboard';

const P = ({ roles, children }) => <ProtectedRoute roles={roles}>{children}</ProtectedRoute>;
const ORG = ['organizer', 'admin'];

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetails />} />
          <Route path="/events/:id/tickets" element={<P><TicketSelection /></P>} />
          <Route path="/checkout/:bookingId" element={<P><Checkout /></P>} />
          <Route path="/my-bookings" element={<P><MyBookings /></P>} />
          <Route path="/tickets/:bookingId" element={<P><TicketView /></P>} />
          <Route path="/profile" element={<P><Profile /></P>} />
          <Route path="/organizer" element={<P roles={ORG}><OrganizerDashboard /></P>} />
          <Route path="/organizer/events/new" element={<P roles={ORG}><EventForm /></P>} />
          <Route path="/organizer/events/:id/edit" element={<P roles={ORG}><EventForm /></P>} />
          <Route path="/organizer/bookings" element={<P roles={ORG}><OrganizerBookings /></P>} />
          <Route path="/admin" element={<P roles={['admin']}><AdminDashboard /></P>} />
          <Route path="*" element={<div className="wrap py-24"><Empty title="Page not found" hint="The page you're looking for doesn't exist." action={{ to: '/', label: 'Back to home' }} /></div>} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
