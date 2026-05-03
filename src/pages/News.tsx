import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDocs, query, collection, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { formatDate } from '../utils/format';
import { Newspaper } from 'lucide-react';

export default function News() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(
      query(collection(db, 'news'), where('status', '==', 'Published'), orderBy('publishedAt', 'desc'))
    ).then(snap => {
      setArticles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  return (
    <div className="bg-[#F7F5F0] min-h-screen pt-24 pb-32">
      <section className="py-16 md:py-24 px-6 max-w-7xl mx-auto border-b-2 border-primary">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
          <h1 className="text-7xl md:text-[120px] font-heading font-bold text-primary leading-none">
            News.
          </h1>
          <p className="text-gray-500 max-w-xs text-right text-lg">
            Stories from our community, for our community.
          </p>
        </div>
      </section>

      {loading ? (
        <section className="max-w-7xl mx-auto px-6 mt-12 space-y-12">
          <div className="w-full aspect-[16/7] rounded-2xl bg-gray-200 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="rounded-2xl overflow-hidden shadow-sm bg-white border border-gray-100 flex flex-col h-96">
                <div className="h-48 bg-gray-200 animate-pulse" />
                <div className="p-6 space-y-4">
                  <div className="w-24 h-4 bg-gray-200 animate-pulse rounded" />
                  <div className="w-full h-6 bg-gray-200 animate-pulse rounded" />
                  <div className="w-3/4 h-6 bg-gray-200 animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : articles.length > 0 ? (
        <>
          <section className="max-w-7xl mx-auto px-6 mt-12">
            <Link to={`/news/${articles[0].id}`}>
              <div className="group relative aspect-[16/7] rounded-2xl overflow-hidden bg-gray-200 cursor-pointer">
                {articles[0].coverImage ? (
                  <img src={articles[0].coverImage} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full bg-primary" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 p-8 md:p-12 text-white max-w-3xl">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-bold uppercase tracking-widest text-accent bg-primary/50 px-3 py-1 rounded-full backdrop-blur-sm">
                      {articles[0].category}
                    </span>
                    <span className="text-white/60 text-sm">
                      {formatDate(articles[0].publishedAt)}
                    </span>
                  </div>
                  <h2 className="text-3xl md:text-5xl font-heading font-bold leading-tight mb-4 group-hover:text-accent transition-colors duration-300">
                    {articles[0].title}
                  </h2>
                  <p className="text-white/70 text-lg hidden md:block line-clamp-2">
                    {articles[0].body?.replace(/[#*`_\[\]]/g, '').substring(0, 200)}...
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-accent font-bold text-sm uppercase tracking-wide">
                    Read Article <span className="group-hover:translate-x-2 transition-transform duration-300 inline-block">→</span>
                  </div>
                </div>
              </div>
            </Link>
          </section>

          <section className="max-w-7xl mx-auto px-6 mt-16">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {articles.slice(1).map(article => (
                <Link to={`/news/${article.id}`} key={article.id}>
                  <div className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 flex flex-col h-full cursor-pointer">
                    <div className="aspect-video overflow-hidden bg-gray-100">
                      {article.coverImage ? (
                        <img src={article.coverImage} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                          <Newspaper size={48} className="text-primary/20" />
                        </div>
                      )}
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {article.category}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(article.publishedAt)}</span>
                      </div>
                      <h3 className="font-heading font-bold text-gray-900 text-xl leading-snug mb-3 group-hover:text-primary transition-colors line-clamp-2 flex-1">
                        {article.title}
                      </h3>
                      <p className="text-gray-500 text-sm line-clamp-2 mb-4">
                        {article.body?.replace(/[#*`_\[\]]/g, '').substring(0, 150)}...
                      </p>
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                        <span className="text-xs text-gray-400">By {article.author || 'Interact Club'}</span>
                        <span className="text-accent font-bold text-sm group-hover:translate-x-1 transition-transform inline-block">→</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="max-w-7xl mx-auto px-6 mt-24 text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
            <Newspaper size={48} />
          </div>
          <h2 className="text-2xl font-bold font-heading text-gray-900 mb-2">No articles published yet</h2>
          <p className="text-gray-500">Check back soon for updates from the club.</p>
        </section>
      )}
    </div>
  );
}
