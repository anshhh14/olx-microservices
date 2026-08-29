import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';

import Frontpage from './pages/Frontpage';
import Login from './pages/Login';
import ChooseRole from './pages/ChooseRole';
import Browse from './pages/Browse';
import Sell from './pages/Sell';
import MyListings from './pages/MyListings';
import ListingDetail from './pages/ListingDetail';
import Cart from './pages/Cart';
import CheckoutDetails from './pages/CheckoutDetails';
import CheckoutSuccess from './pages/CheckoutSuccess';
import Messages from './pages/Messages';
import Orders from './pages/Orders';

const EXEMPT = ['/', '/choose-role', '/login', '/checkout-success'];

function RoleGate({ children }) {
  const { isLoggedIn, mode } = useAuth();
  const location = useLocation();
  if (isLoggedIn && !mode && !EXEMPT.includes(location.pathname)) {
    return <Navigate to="/choose-role" replace />;
  }
  return children;
}

export default function App() {
  const location = useLocation();
  // Frontpage and Login render their own headers, so the shared Navbar stays out of the way.
  const hasOwnHeader = location.pathname === '/login' || location.pathname === '/';

  return (
    <RoleGate>
      {!hasOwnHeader && <Navbar />}
      <Routes>
        <Route path="/" element={<Frontpage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/choose-role" element={<ChooseRole />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/sell" element={<Sell />} />
        <Route path="/my-listings" element={<MyListings />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/listing/:id" element={<ListingDetail />} />
        <Route path="/checkout-details/listing/:id" element={<CheckoutDetails mode="listing" />} />
        <Route path="/checkout-details/cart" element={<CheckoutDetails mode="cart" />} />
        <Route path="/checkout-success" element={<CheckoutSuccess />} />
        <Route path="*" element={<Navigate to="/browse" replace />} />
      </Routes>
    </RoleGate>
  );
}
