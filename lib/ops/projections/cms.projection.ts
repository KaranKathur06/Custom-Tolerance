import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";

export class CMSProjectionService {
  static async getContent(type: 'banners' | 'pages' | 'announcements' | 'blogs', page = 1, limit = 50) {
    const supabase = createSupabaseServiceRoleClient();
    if (!supabase) throw new Error("Supabase client not initialized");
    
    let table = '';
    switch (type) {
      case 'banners': table = 'banners'; break; // Keep existing banners table
      case 'pages': table = 'cms_pages'; break;
      case 'announcements': table = 'cms_announcements'; break;
      case 'blogs': table = 'cms_blog_posts'; break;
    }

    const { data, count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      console.error(`Error fetching CMS content (${table}):`, error);
      return { data: [], count: 0 };
    }

    return { data, count };
  }

  static async getStats() {
    const supabase = createSupabaseServiceRoleClient();
    if (!supabase) return { pages: 0, blogs: 0, announcements: 0, banners: 0 };
    
    const [pages, blogs, announcements, banners] = await Promise.all([
      supabase.from('cms_pages').select('id', { count: 'exact', head: true }),
      supabase.from('cms_blog_posts').select('id', { count: 'exact', head: true }),
      supabase.from('cms_announcements').select('id', { count: 'exact', head: true }),
      supabase.from('banners').select('id', { count: 'exact', head: true }),
    ]);

    return {
      pages: pages.count || 0,
      blogs: blogs.count || 0,
      announcements: announcements.count || 0,
      banners: banners.count || 0,
    };
  }
}
