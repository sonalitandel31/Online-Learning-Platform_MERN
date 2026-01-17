import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../api/api";
import { 
  ChevronLeft, ChevronRight, Menu, X, Lock, 
  CheckCircle, Play, FileText, Type, ArrowLeft, 
  Layout, Sparkles 
} from "lucide-react";

function Lesson() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completedLessons, setCompletedLessons] = useState([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notification, setNotification] = useState("");

  const videoRef = useRef(null);
  const loggedInUser = JSON.parse(localStorage.getItem("user"));
  const studentId = loggedInUser?._id;
  const BASE_URL = import.meta.env.VITE_BASE_URL?.replace(/\/+$/, "");

  const showNotify = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  useEffect(() => {
    const fetchLessonData = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/courses/${courseId}`);
        const courseData = res.data;
        setCourse(courseData);
        setLessons(courseData.lessons || []);

        const enrollmentRes = await api.get("/enrollments");
        const enrollments = Array.isArray(enrollmentRes.data.enrollments) ? enrollmentRes.data.enrollments : [];
        setIsEnrolled(enrollments.some(e => e.course?._id === courseId));

        const progressRes = await api.get(`/${studentId}/completedLessons`);
        setCompletedLessons(Array.isArray(progressRes.data) ? progressRes.data : []);

        const lesson = courseData.lessons.find(l => l._id === lessonId) || courseData.lessons[0];
        if (lesson) {
          setCurrentLesson(lesson);
          localStorage.setItem(`lastLesson_${courseId}`, lesson._id);
        } else {
          setError("Lesson not found.");
        }
      } catch (err) {
        setError("Failed to load details.");
      } finally {
        setLoading(false);
      }
    };
    fetchLessonData();
  }, [courseId, lessonId, studentId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleTimeUpdate = () => setVideoProgress((video.currentTime / video.duration) * 100);
    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [currentLesson]);

  useEffect(() => {
    if (!currentLesson || !isEnrolled) return;
    const markAsCompleted = async () => {
      if (completedLessons.includes(currentLesson._id)) return;
      try {
        await api.post(`/lessons/${currentLesson._id}/markWatched`, { studentId, courseId: course._id });
        setCompletedLessons(prev => [...prev, currentLesson._id]);
      } catch (err) { console.error(err); }
    };
    if (currentLesson.contentType?.toLowerCase() === "video" ? videoProgress >= 90 : true) markAsCompleted();
  }, [currentLesson, videoProgress, isEnrolled]);

  const handleNext = () => {
    const index = lessons.findIndex(l => l._id === currentLesson._id);
    if (index < lessons.length - 1) navigate(`/course/${courseId}/lessons/${lessons[index + 1]._id}`);
    else showNotify("🎉 You've finished the course content!");
  };

  const handlePrev = () => {
    const index = lessons.findIndex(l => l._id === currentLesson._id);
    if (index > 0) navigate(`/course/${courseId}/lessons/${lessons[index - 1]._id}`);
    else showNotify("This is the first lesson!");
  };

  if (loading) return (
    <div className="d-flex flex-column justify-content-center align-items-center vh-100 bg-white">
      <div className="spinner-border text-purple mb-3" style={{width: '3rem', height: '3rem'}}></div>
      <h5 className="text-purple fw-light">Opening your lesson...</h5>
    </div>
  );

  const fileUrl = currentLesson?.fileUrl?.startsWith("http") ? currentLesson.fileUrl : `${BASE_URL}/${currentLesson?.fileUrl?.replace(/^\//, "")}`;
  const canAccess = currentLesson?.isPreviewFree || isEnrolled;
  const currentIndex = lessons.findIndex(l => l._id === currentLesson._id);

  return (
    <div className="lesson-page-container">
      <style>{`
        :root { 
          --purple: #6f42c1; 
          --light-purple: #f3effb; 
          --orange: #fd7e14; 
          --dark: #2d1b4e; 
        }
        
        .lesson-page-container { display: flex; height: 100vh; background: var(--light-purple); overflow: hidden; }
        
        /* Sidebar Styles */
        .lesson-sidebar { 
          width: 350px; background: white; border-right: 1px solid #e0d7f2; 
          display: flex; flex-direction: column; transition: transform 0.3s ease;
          box-shadow: 4px 0 15px rgba(111, 66, 193, 0.05);
        }
        
        .lesson-list { flex-grow: 1; overflow-y: auto; padding: 10px; }
        
        .lesson-item { 
          cursor: pointer; padding: 14px 18px; border-radius: 12px;
          margin-bottom: 8px; display: flex; align-items: center; gap: 12px; transition: all 0.2s;
          border: 1px solid transparent;
        }
        .lesson-item:hover { background: #f8f5fe; }
        .lesson-item.active { 
          background: white; 
          border: 1px solid var(--purple); 
          box-shadow: 0 4px 12px rgba(111, 66, 193, 0.1);
        }
        .lesson-item.locked { opacity: 0.5; filter: grayscale(1); cursor: not-allowed; }

        /* Main Content */
        .main-content { flex-grow: 1; overflow-y: auto; position: relative; background: var(--light-purple); }
        .content-inner { max-width: 1100px; margin: 0 auto; width: 100%; padding-bottom: 100px; }

        .player-wrapper { 
          background: #000; border-radius: 20px; overflow: hidden; 
          box-shadow: 0 25px 50px -12px rgba(111, 66, 193, 0.2); margin-bottom: 2rem;
          position: relative; aspect-ratio: 16/9; border: 4px solid white;
        }

        .pdf-frame { width: 100%; height: 80vh; border: none; border-radius: 20px; background: white; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }

        /* Custom Scrollbar */
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1c4e9; border-radius: 10px; }

        @media (max-width: 991px) {
          .lesson-sidebar { 
            position: fixed; left: 0; top: 0; bottom: 0; z-index: 2000;
            transform: ${sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'};
            width: 85%; max-width: 320px;
          }
          .sidebar-overlay {
            position: fixed; inset: 0; background: rgba(45, 27, 78, 0.4); 
            backdrop-filter: blur(4px); z-index: 1999; display: ${sidebarOpen ? 'block' : 'none'};
          }
        }

        .mobile-nav-bar {
          position: fixed; bottom: 0; left: 0; right: 0; background: white;
          border-top: 1px solid #e0d7f2; padding: 12px 20px; display: none;
          justify-content: space-between; align-items: center; z-index: 1500;
        }
        @media (max-width: 991px) { .mobile-nav-bar { display: flex; } }

        .notify-toast { 
          position: fixed; top: 20px; left: 50%; transform: translateX(-50%); 
          background: var(--purple); color: white; padding: 12px 24px; 
          border-radius: 50px; z-index: 3000; font-weight: 600; box-shadow: 0 10px 25px rgba(111, 66, 193, 0.3);
        }

        .btn-purple { background: var(--purple); color: white; }
        .btn-purple:hover { background: #5a32a3; color: white; }
        .btn-orange { background: var(--orange); color: white; }
        .btn-orange:hover { background: #e66d00; color: white; }
        .text-purple { color: var(--purple); }
      `}</style>

      {/* Mobile Sidebar Overlay */}
      <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>

      {/* Sidebar */}
      <aside className="lesson-sidebar">
        <div className="p-4 border-bottom bg-white">
          <button 
            className="btn btn-link text-purple text-decoration-none fw-bold p-0 mb-3 d-flex align-items-center gap-2"
            onClick={() => navigate(`/courses/${courseId}`)}
          >
            <ArrowLeft size={18} /> Back to Course
          </button>
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <h6 className="m-0 fw-bold text-dark">Course Curriculum</h6>
              <div className="progress mt-2" style={{height: '4px', width: '100px'}}>
                <div className="progress-bar bg-purple" style={{width: `${(completedLessons.length / lessons.length) * 100}%`}}></div>
              </div>
            </div>
            <button className="btn btn-light d-lg-none" onClick={() => setSidebarOpen(false)}><X size={20}/></button>
          </div>
        </div>

        <div className="lesson-list custom-scrollbar">
          {lessons.map((l, i) => {
            const locked = !l.isPreviewFree && !isEnrolled;
            const active = l._id === currentLesson._id;
            const done = completedLessons.includes(l._id);
            return (
              <div key={l._id} className={`lesson-item ${active ? 'active' : ''} ${locked ? 'locked' : ''}`} 
                onClick={() => { if(!locked) { setCurrentLesson(l); setSidebarOpen(false); navigate(`/course/${courseId}/lessons/${l._id}`); } }}>
                <div className={`fw-bold small ${active ? 'text-purple' : 'opacity-30'}`}>{String(i + 1).padStart(2, '0')}</div>
                <div className="flex-grow-1">
                  <div className={`fw-bold small ${active ? 'text-purple' : 'text-secondary'}`}>{l.title}</div>
                  <div className="d-flex align-items-center gap-2 mt-1" style={{fontSize: '10px'}}>
                    {l.contentType === 'video' ? <Play size={10} className="text-purple"/> : <FileText size={10} className="text-purple"/>}
                    <span className="text-uppercase fw-bold text-muted">{l.contentType}</span>
                  </div>
                </div>
                {done ? <CheckCircle size={18} className="text-success" /> : locked ? <Lock size={14} className="text-muted" /> : null}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content p-3 p-lg-5">
        <div className="content-inner">
          
          {/* Top Bar (Desktop) */}
          <div className="d-none d-lg-flex justify-content-between align-items-center mb-4">
             <div className="d-flex align-items-center gap-2">
                <div className="bg-white p-2 rounded-3 shadow-sm text-purple"><Layout size={20}/></div>
                <h5 className="fw-bold m-0 text-dark">{course?.title}</h5>
             </div>
             <div className="badge bg-white text-purple border px-3 py-2 rounded-pill shadow-sm fw-bold">
                {completedLessons.length} / {lessons.length} Modules Finished
             </div>
          </div>

          {/* Mobile Header Toggle */}
          <div className="d-lg-none d-flex align-items-center justify-content-between mb-4 bg-white p-2 rounded-pill shadow-sm">
              <button className="btn btn-purple rounded-circle p-2" onClick={() => setSidebarOpen(true)}><Menu size={20}/></button>
              <span className="small fw-bold text-purple text-truncate mx-2">{currentLesson?.title}</span>
              <button className="btn btn-light rounded-circle p-2" onClick={() => navigate(`/courses/${courseId}`)}><X size={20}/></button>
          </div>

          <div className="lesson-header mb-4">
            <h2 className="fw-bolder text-dark mb-1">{currentLesson?.title}</h2>
            <div className="d-flex align-items-center gap-2 text-muted small fw-bold">
                <Sparkles size={14} className="text-orange"/>
                <span>PART {currentIndex + 1} OF {lessons.length}</span>
            </div>
          </div>

          {canAccess ? (
            <div className="media-section">
              {currentLesson?.contentType?.toLowerCase() === "video" ? (
                <div className="player-wrapper">
                  <video ref={videoRef} className="w-100 h-100" controls controlsList="nodownload">
                    <source src={fileUrl} type="video/mp4" />
                  </video>
                </div>
              ) : currentLesson?.contentType?.toLowerCase() === "pdf" ? (
                <div className="pdf-container mb-4">
                   <iframe src={`${fileUrl}#toolbar=0`} className="pdf-frame" title="PDF Content" />
                </div>
              ) : (
                <div className="card border-0 shadow-sm p-4 mb-4 bg-white rounded-4">
                   <div className="d-flex align-items-center gap-2 mb-3 text-purple">
                      <Type size={24} /> <h5 className="m-0 fw-bold">Lesson Notes</h5>
                   </div>
                   <div className="lh-lg text-secondary" dangerouslySetInnerHTML={{ __html: currentLesson?.description }} />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-5 px-4 bg-white rounded-4 shadow-sm border border-white">
              <div className="bg-light-purple rounded-circle d-inline-flex p-4 mb-4 text-purple">
                <Lock size={40} />
              </div>
              <h4 className="fw-bold text-dark">Premium Content Locked</h4>
              <p className="text-muted mb-4 mx-auto" style={{maxWidth: '350px'}}>This lesson is part of the premium curriculum. Enroll now to unlock high-quality learning materials.</p>
              <button className="btn btn-orange px-5 py-3 rounded-pill fw-bold shadow-lg" onClick={() => navigate(`/courses/${courseId}`)}>
                Unlock Full Access
              </button>
            </div>
          )}

          {/* Desktop Navigation */}
          <div className="d-none d-lg-flex justify-content-between mt-5 pt-4 border-top border-purple border-opacity-10">
            <button className="btn btn-link text-purple text-decoration-none fw-bold d-flex align-items-center gap-2 px-0" 
              onClick={handlePrev} disabled={currentIndex === 0}>
              <div className="bg-white p-2 rounded-circle shadow-sm"><ChevronLeft size={20}/></div> Previous
            </button>
            
            <button className="btn btn-orange px-5 py-2 rounded-pill fw-bold shadow-lg d-flex align-items-center gap-2" 
              onClick={handleNext}>
              {currentIndex === lessons.length - 1 ? 'Complete Content' : 'Next Lesson'} <ChevronRight size={20}/>
            </button>
          </div>
        </div>
      </main>

      {/* Mobile Fixed Navigation Bar */}
      <div className="mobile-nav-bar shadow-lg">
        <button className="btn btn-light rounded-pill px-3" onClick={handlePrev} disabled={currentIndex === 0}>
          <ChevronLeft size={20} className="text-purple"/>
        </button>
        <div className="text-center">
          <div className="fw-bold text-purple small">{currentIndex + 1} / {lessons.length}</div>
          <div className="text-muted" style={{fontSize: '9px', fontWeight: '800'}}>MODULE PROGRESS</div>
        </div>
        <button className="btn btn-orange rounded-pill px-4 fw-bold shadow-sm" onClick={handleNext}>
          {currentIndex === lessons.length - 1 ? <CheckCircle size={20}/> : <ChevronRight size={20}/>}
        </button>
      </div>

      {/* Toast Notification */}
      {notification && <div className="notify-toast animate__animated animate__fadeInDown">{notification}</div>}
    </div>
  );
}

export default Lesson;