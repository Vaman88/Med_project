'use client';
import { useEffect, useState } from 'react';
import { browserCloud, cloudConfigured } from '@/lib/cloud';
import { AdultPlanner } from "./adult-planner";
import { GuestKitchen } from './guest-kitchen';

export function FoodApp() {
  const [account,setAccount]=useState(false);
  useEffect(()=>{
    if(/access_token=|type=recovery/.test(window.location.hash)){setAccount(true);return;}
    if(cloudConfigured)void browserCloud().auth.getSession().then(({data})=>{if(data.session)setAccount(true);}).catch(()=>{});
  },[]);
  return account?<><div className="account-return"><button className="text-button" onClick={()=>setAccount(false)}>Back to guest kitchen</button></div><AdultPlanner /></>:<GuestKitchen onAccount={()=>setAccount(true)}/>;
}
