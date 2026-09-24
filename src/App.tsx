import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { PropertiesProvider } from './context/PropertiesContext'
import { FavoritesProvider } from './context/FavoritesContext'
import { BookingsProvider } from './context/BookingsContext'
import { AgreementsProvider } from './context/AgreementsContext'
import { ChatProvider } from './context/ChatContext'
import { RecentlyViewedProvider } from './context/RecentlyViewedContext'
import { RequireAuth } from './components/auth/RequireAuth'
import LandingPage from './pages/LandingPage'
import SearchPage from './pages/SearchPage'
import PropertyDetailsPage from './pages/PropertyDetailsPage'
import FavoritesPage from './pages/FavoritesPage'
import DashboardPage from './pages/DashboardPage'
import ProfilePage from './pages/ProfilePage'
import RenterPreferencesPage from './pages/RenterPreferencesPage'
import BuyerPreferencesPage from './pages/BuyerPreferencesPage'
import ChatPage from './pages/ChatPage'
import BookingsPage from './pages/BookingsPage'
import AgreementsPage from './pages/AgreementsPage'
import AgreementDetailsPage from './pages/AgreementDetailsPage'
import AgreementWizardPage from './pages/AgreementWizardPage'
import AuthPage from './pages/AuthPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import UsersPage from './pages/UsersPage'
import PropertiesPage from './pages/PropertiesPage'
import PropertyFormPage from './pages/PropertyFormPage'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  return (
    <Router>
      <AuthProvider>
        <PropertiesProvider>
          <FavoritesProvider>
            <BookingsProvider>
              <AgreementsProvider>
                <ChatProvider>
                  <RecentlyViewedProvider>
                    <Routes>
                      <Route path="/" element={<LandingPage />} />
                      <Route path="/auth" element={<AuthPage />} />
                      <Route
                        path="/reset-password"
                        element={<ResetPasswordPage />}
                      />
                      <Route path="/search" element={<SearchPage />} />
                      <Route
                        path="/properties/:id"
                        element={<PropertyDetailsPage />}
                      />
                      <Route path="/properties" element={<PropertiesPage />} />
                      <Route
                        path="/favorites"
                        element={
                          <RequireAuth roles={['tenant', 'buyer', 'owner']}>
                            <FavoritesPage />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/dashboard"
                        element={
                          <RequireAuth>
                            <DashboardPage />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/profile"
                        element={
                          <RequireAuth>
                            <ProfilePage />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/preferences"
                        element={
                          <RequireAuth roles={['tenant']}>
                            <RenterPreferencesPage />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/buyer/preferences"
                        element={
                          <RequireAuth roles={['buyer']}>
                            <BuyerPreferencesPage />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/chat"
                        element={
                          <RequireAuth>
                            <ChatPage />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/chat/:propertyId"
                        element={
                          <RequireAuth>
                            <ChatPage />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/bookings"
                        element={
                          <RequireAuth>
                            <BookingsPage />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/agreements"
                        element={
                          <RequireAuth>
                            <AgreementsPage />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/agreements/new"
                        element={
                          <RequireAuth>
                            <AgreementWizardPage />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/agreements/:id"
                        element={
                          <RequireAuth>
                            <AgreementDetailsPage />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/owner/properties"
                        element={
                          <RequireAuth roles={['owner']}>
                            <PropertiesPage />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/owner/properties/new"
                        element={
                          <RequireAuth roles={['owner']}>
                            <PropertyFormPage />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/owner/properties/:id/edit"
                        element={
                          <RequireAuth roles={['owner']}>
                            <PropertyFormPage />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/users"
                        element={
                          <RequireAuth roles={['admin']}>
                            <UsersPage />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/admin/users"
                        element={
                          <RequireAuth roles={['admin']}>
                            <UsersPage />
                          </RequireAuth>
                        }
                      />
                      <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                  </RecentlyViewedProvider>
                </ChatProvider>
              </AgreementsProvider>
            </BookingsProvider>
          </FavoritesProvider>
        </PropertiesProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
