import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { Button } from '../../components/ui/Button';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Check if user document exists
      const userDocRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        const isAutoAdmin = result.user.email === 'khalidfx100@gmail.com';
        
        // Create initial pending profile
        await setDoc(userDocRef, {
          name: result.user.displayName || '',
          email: result.user.email || '',
          role: isAutoAdmin ? 'admin' : 'member',
          status: isAutoAdmin ? 'active' : 'pending',
          avatar: result.user.photoURL || '',
          createdAt: serverTimestamp(),
        });
        
        if (isAutoAdmin) {
          navigate('/admin');
        } else {
          navigate('/join'); // Redirect to finish application
        }
      } else {
        const data = userDoc.data();
        
        // Force upgrade if they are the designated admin but currently pending
        if (result.user.email === 'khalidfx100@gmail.com' && data.role !== 'admin') {
           await setDoc(userDocRef, { role: 'admin', status: 'active' }, { merge: true });
           data.role = 'admin';
           data.status = 'active';
        }

        if (data.role === 'admin' || data.role === 'officer') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-[#F7F5F0] py-12 px-6">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 text-center">
        <h1 className="text-3xl font-heading font-bold text-primary mb-2">Welcome Back</h1>
        <p className="text-gray-500 mb-8">Sign in to access your dashboard.</p>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <Button 
          variant="secondary" 
          className="w-full border border-gray-200" 
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
            <path fill="currentColor" fillRule="evenodd" d="M20.64 12.2045c0-.6381-.0573-1.2518-.1636-1.8409H12v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9086c1.7018-1.5668 2.6836-3.874 2.6836-6.615z" clipRule="evenodd"></path>
            <path fill="currentColor" fillRule="evenodd" d="M12 21c2.43 0 4.4673-.806 5.9564-2.1805l-2.9086-2.2581c-.8059.54-1.8368.859-3.0478.859-2.344 0-4.3282-1.5831-5.036-3.7104H3.9574v2.3318C5.4382 18.9832 8.4818 21 12 21z" clipRule="evenodd"></path>
            <path fill="currentColor" fillRule="evenodd" d="M6.964 13.71c-.18-.54-.2822-1.1168-.2822-1.71s.1023-1.17.2823-1.71V7.9582H3.9573A8.9965 8.9965 0 003 12c0 1.4523.3477 2.8268.9573 4.0418L6.964 13.71z" clipRule="evenodd"></path>
            <path fill="currentColor" fillRule="evenodd" d="M12 6.979c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C16.4632 4.2818 14.426 3 12 3 8.4818 3 5.4382 5.0168 3.9573 7.9582L6.964 10.29c.7078-2.1273 2.692-3.311 5.036-3.311z" clipRule="evenodd"></path>
          </svg>
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </Button>
      </div>
    </div>
  );
}
