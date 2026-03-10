import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import PageTransition from './components/PageTransition';
import LoadingScreen from './components/LoadingScreen';

const HomePage = lazy(() => import('./pages/HomePage'));
const SeriesListPage = lazy(() => import('./pages/SeriesListPage'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));

function App() {
  const location = useLocation();

  return (
    <Suspense fallback={<LoadingScreen loading={true} />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <PageTransition>
                <HomePage />
              </PageTransition>
            }
          />
          <Route
            path="/series/:seriesCode"
            element={
              <PageTransition>
                <SeriesListPage />
              </PageTransition>
            }
          />
          <Route
            path="/favorites"
            element={
              <PageTransition>
                <FavoritesPage />
              </PageTransition>
            }
          />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}

export default App;
