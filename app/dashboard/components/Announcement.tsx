import React, { useEffect, useState } from 'react'
import { getAnnouncements } from '../service/announcementService';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp } from 'lucide-react';

const Announcement = ({className}: {className?: string}) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState<boolean[]>([])

  const toggleAnnouncement = (index: number) => {
    setIsOpen(prev => {
        const newOpen = [...prev];
        newOpen[index] = !newOpen[index];
        return newOpen;
    })
  }



  useEffect(() => {
    const fetchAnnouncements = async () => {
        try {
            const announcements = await getAnnouncements();
            setAnnouncements(announcements);
            setIsLoading(false);
        } catch (error){
            console.error('Failed to fetch announcements', error)
            setIsLoading(false);
        }
    }
    fetchAnnouncements();
  },[])



  return (
    <div className={`col-span-3 ${className} max-md:col-span-12 bg-white/75   backdrop-blur-sm p-2  rounded-3xl `}>
        <div className='overflow-y-auto max-h-[270px] pr-2 custom-scrollbar ' >
            <h2 className='text-lg font-bold mb-1 text-gray-800 p-1'>Announcements</h2>

            {isLoading ? (
                <div className='flex flex-col animate-pulse gap-2'>
                    <div className='h-4 bg-gray-200 rounded-md w-full'></div>
                    <div className='h-4 bg-gray-200 rounded-md w-full'></div>
                    <div className='h-4 bg-gray-200 rounded-md w-full'></div>
                </div>
            ): announcements.length > 0 ?(
                <div className='flex flex-col space-y-2 p-2'>
                    {announcements.map((announcement, index) => (
                        <div key={announcement.id} className='border-b-2 pb-2 last:border-b-0 space-y-2'>
                            <div className='flex justify-between items-start'>
                                <h3 className='text-sm w-2/3  font-ancizar font-bold text-gray-600'>{announcement.title}</h3>
                                <button className='' onClick={() => toggleAnnouncement(index)}>
                                    {isOpen[index] ? <ChevronUp className='w-4 h-4 text-gray-600' /> : <ChevronDown className='w-4 h-4 text-gray-600' />}
                                </button>
                            </div>
                           
                            {isOpen[index] && (
                                <p className='text-xs text-gray-500'>{announcement.content}</p>
                            )}
                            <p className='text-xs text-gray-500'>{format(new Date(announcement.published_at), 'MMM d, yyyy')}</p>
                        </div>
                    ))}
                </div>
            ):(
                <p className='text-gray-500 text-center pt-4'>No announcements found</p>
            )}
        </div>
        <div className="absolute rounded-b-3xl bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white/75 to-transparent pointer-events-none"></div>
    </div>
  )
}

export default Announcement