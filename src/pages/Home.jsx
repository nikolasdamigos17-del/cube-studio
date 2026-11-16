import { useState, useEffect } from 'react';
import MobileHome from '../components/MobileHome';

/* Αρχική: ο ίδιος πίνακας widgets παντού — σε desktop η σταθερή «bento» διάταξη. */
export default function Home() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return isMobile ? <MobileHome/> : <MobileHome columns={6} rowHeight={152} wide/>;
}
