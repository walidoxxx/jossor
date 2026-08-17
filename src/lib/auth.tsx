import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

const Ctx = createContext<{session: Session|null; loading: boolean}>({session:null,loading:true});

export function AuthProvider({children}:{children:ReactNode}) {
  const [session,setSession] = useState<Session|null>(null);
  const [loading,setLoading] = useState(true);
  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false);});
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_e,s)=>setSession(s));
    return ()=>subscription.unsubscribe();
  },[]);
  return <Ctx.Provider value={{session,loading}}>{children}</Ctx.Provider>;
}
export function useAuth(){ return useContext(Ctx); }
