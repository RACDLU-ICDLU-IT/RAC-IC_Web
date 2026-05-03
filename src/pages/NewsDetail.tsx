import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { marked } from 'marked';
import { formatDate } from '../utils/format';

export default function NewsDetail() {
  const { id } = useParams();
  const [article, setArticle] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getDoc(doc(db, 'news', id)).then(snap => {
      if (snap.exists()) {
        setArticle({ id: snap.id, ...snap.data() });
      }
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (article) {
      getDocs(
        query(collection(db, 'news'), where('status', '==', 'Published'), orderBy('publishedAt', 'desc'), limit(4))
      ).then(snap => {
        setRelated(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => d.id !== id).slice(0, 3));
      });
    }
  }, [article, id]);

  if (loading) {
    return <div className="min-h-screen pt-32 pb-24 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  if (!article) {
    return <div className="min-h-screen pt-32 pb-24 text-center">
      <h1 className="text-4xl font-heading font-bold text-gray-900 mb-4">Article Not Found</h1>
      <Link to="/news" className="text-accent font-bold hover:underline">← Back to News</Link>
    </div>;
  }

  return (
    <div className="bg-white min-h-screen pt-24 pb-32">
      <article>
        {/* Full-width hero image */}
        <div className="relative w-full h-[60vh] min-h-[400px] bg-gray-900">
          {article.coverImage && (
            <img src={article.coverImage} className="w-full h-full object-cover opacity-60" alt="" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          
          <div className="absolute bottom-0 left-0 w-full p-8 md:p-16 max-w-5xl mx-auto inset-x-0">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-xs font-bold uppercase tracking-widest text-accent bg-primary/50 px-3 py-1 rounded-full backdrop-blur-sm">
                {article.category}
              </span>
              <span className="text-white/80 text-sm">
                {formatDate(article.publishedAt)}
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-bold text-white leading-tight mb-6">
              {article.title}
            </h1>
            <div className="flex items-center gap-3 text-white/80">
              <span>By <strong className="text-white">{article.author || 'Interact Club'}</strong></span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-6 py-16">
          <div 
            className="prose prose-lg max-w-none prose-headings:font-heading prose-headings:font-bold prose-headings:text-primary prose-a:text-accent prose-a:no-underline hover:prose-a:underline prose-p:text-gray-700 prose-p:leading-relaxed prose-blockquote:border-l-accent prose-blockquote:bg-gray-50 prose-blockquote:py-1 prose-blockquote:px-6 prose-blockquote:rounded-r-lg prose-img:rounded-xl"
            dangerouslySetInnerHTML={{ __html: marked(article.body || '') }} 
          />
        </div>

        <div className="max-w-3xl mx-auto px-6 pb-16">
          <Link to="/news" className="inline-flex items-center gap-2 text-gray-500 hover:text-primary font-bold transition-colors">
            ← Back to News
          </Link>
        </div>
      </article>

      {/* More stuff */}
      {related.length > 0 && (
        <section className="bg-[#F7F5F0] py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-heading font-bold text-primary mb-12">More from our club</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {related.map((rel: any) => (
                <Link to={`/news/${rel.id}`} key={rel.id}>
                  <div className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
                    <div className="aspect-video bg-gray-200 overflow-hidden">
                      {rel.coverImage && <img src={rel.coverImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                    </div>
                    <div className="p-6">
                      <div className="text-xs text-accent font-bold uppercase mb-2">{rel.category}</div>
                      <h3 className="font-heading font-bold text-lg text-primary group-hover:text-accent transition-colors line-clamp-2">
                        {rel.title}
                      </h3>
                      <div className="mt-4 text-xs text-gray-400">{formatDate(rel.publishedAt)}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
