import React, { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getAllOfflineVideos, removeVideoOffline, saveProgressLocally } from "../../../utils/offlineDB";
import api from "../../../api/api";
import { useTheme } from "../../../context/ThemeContext";
import {
    Download, PlayCircle, Trash2, WifiOff, ArrowLeft,
    Search, Folder, HardDrive, X, Play, Film, AlertCircle, CheckCircle
} from "lucide-react";

export default function Downloads() {
    const navigate = useNavigate();
    const { primaryColor } = useTheme();
    const [downloadedVideos, setDownloadedVideos] = useState([]);
    const [playingVideo, setPlayingVideo] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");

    const [completedInSession, setCompletedInSession] = useState([]);
    const videoRef = useRef(null);

    const [watchedLessons, setWatchedLessons] = useState([]);

    useEffect(() => {
        const fetchWatchedStatus = async () => {
            const loggedInUser = JSON.parse(localStorage.getItem("user") || "null");
            if (!loggedInUser) return;

            const cachedWatched = JSON.parse(localStorage.getItem(`watched_${loggedInUser._id}`) || "[]");
            setWatchedLessons(cachedWatched);

            if (navigator.onLine) {
                try {
                    const token = localStorage.getItem("token");
                    const res = await api.get("/enrollments", {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    const data = res.data?.data || res.data || [];
                    const enrollments = Array.isArray(data) ? data : (Array.isArray(res.data?.enrollments) ? res.data.enrollments : []);

                    let completedIds = [];
                    enrollments.forEach(en => {
                        if (en.completedLessons) {
                            completedIds = [...completedIds, ...en.completedLessons.map(String)];
                        }
                    });

                    setWatchedLessons(completedIds);
                    localStorage.setItem(`watched_${loggedInUser._id}`, JSON.stringify(completedIds));

                } catch (error) {
                    console.error("Failed to fetch watched status", error);
                }
            }
        };

        fetchWatchedStatus();
    }, []);

    const themeColor = primaryColor || "#6f42c1";

    useEffect(() => {
        loadDownloads();
    }, []);

    const loadDownloads = async () => {
        const loggedInUser = JSON.parse(localStorage.getItem("user") || "null");
        if (!loggedInUser) return;

        // NAYA: Sirf apne videos laao
        const videos = await getAllOfflineVideos(loggedInUser._id);
        setDownloadedVideos(videos);
    };

    const handlePlay = (videoItem) => {
        if (playingVideo?.url) URL.revokeObjectURL(playingVideo.url);
        const url = URL.createObjectURL(videoItem.blob);
        setPlayingVideo({ ...videoItem, url });

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (lessonId) => {
        await removeVideoOffline(lessonId);
        if (playingVideo?.lessonId === lessonId) setPlayingVideo(null);
        loadDownloads();
    };

    const markVideoCompleted = async (videoData) => {
        const loggedInUser = JSON.parse(localStorage.getItem("user") || "null");
        if (!loggedInUser) return;

        setCompletedInSession(prev => [...prev, videoData.lessonId]);

        const payload = {
            courseId: videoData.courseId,
            contentType: "video",
            title: videoData.lessonTitle
        };

        if (navigator.onLine) {
            // Agar online hai, direct server par bhejo
            try {
                await api.post(`/courses/${videoData.courseId}/lessons/${videoData.lessonId}/markWatched`, {}, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });
                console.log("Progress synced directly to server.");
            } catch (err) {

                await saveProgressLocally(videoData.lessonId, payload, loggedInUser._id);
            }
        } else {
            console.log("Offline Mode: Progress saved locally.");
            await saveProgressLocally(videoData.lessonId, payload, loggedInUser._id);
        }
    };

    // Size converter
    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Calculate Total Storage
    const totalStorageUsed = useMemo(() => {
        const totalBytes = downloadedVideos.reduce((acc, item) => acc + (item.blob?.size || 0), 0);
        return formatBytes(totalBytes);
    }, [downloadedVideos]);

    // Filter & Group by Course
    const groupedDownloads = useMemo(() => {
        const filtered = downloadedVideos.filter(item => {
            const lessonName = item.lessonTitle || "Unknown Lesson";
            const courseName = item.courseTitle || "Unknown Course";
            return lessonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                courseName.toLowerCase().includes(searchQuery.toLowerCase());
        });

        return filtered.reduce((acc, item) => {
            const cId = item.courseId || "unknown_course";
            if (!acc[cId]) {
                acc[cId] = {
                    courseTitle: item.courseTitle || "Unknown Course",
                    lessons: []
                };
            }
            acc[cId].lessons.push(item);
            return acc;
        }, {});
    }, [downloadedVideos, searchQuery]);

    return (
        <div className="downloads-page">
            <style>{`
                .downloads-page { background-color: #f8f9fa; min-height: 100vh; padding-bottom: 80px; font-family: 'Inter', sans-serif; }
                .text-theme { color: ${themeColor} !important; }
                .bg-theme { background-color: ${themeColor} !important; color: white !important; }
                .bg-theme-light { background-color: ${themeColor}15 !important; } 
                .btn-theme { background-color: ${themeColor}; color: white; border: none; transition: all 0.2s; }
                .btn-theme:hover { filter: brightness(0.9); color: white; transform: translateY(-1px); }
                
                .glass-header { background: rgba(255,255,255,0.85); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(0,0,0,0.05); }
                
                .video-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid rgba(0,0,0,0.05); }
                .video-card:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(0,0,0,0.08) !important; }
                
                .thumb-container { position: relative; overflow: hidden; }
                .play-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s ease; }
                .video-card:hover .play-overlay { opacity: 1; }
                .play-icon-pulse { transform: scale(0.8); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                .video-card:hover .play-icon-pulse { transform: scale(1); }

                /* Inputs */
                .search-input { 
                    color: #000 !important; 
                    background-color: #f8f9fa !important;
                }
                .search-input::placeholder { 
                    color: #6c757d !important; 
                }
                .search-input:focus { 
                    color: #000 !important;
                    background-color: #fff !important;
                    border-color: ${themeColor} !important; 
                    box-shadow: 0 0 0 0.25rem ${themeColor}30 !important; 
                }
            `}</style>

            <div className="glass-header sticky-top">
                <div className="container py-3 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                    <div className="d-flex align-items-center gap-3">
                        <button className="btn btn-light rounded-circle p-2 border shadow-sm" onClick={() => navigate(-1)}>
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h4 className="fw-bolder m-0 d-flex align-items-center gap-2 text-dark">
                                <Download className="text-theme" size={26} /> My Downloads
                            </h4>
                            <div className="small text-muted d-flex align-items-center gap-2 mt-1 fw-medium">
                                <HardDrive size={14} /> {downloadedVideos.length} Videos <span className="text-theme">•</span> {totalStorageUsed} Used
                            </div>
                        </div>
                    </div>

                    <div className="d-flex align-items-center gap-3">
                        {downloadedVideos.length > 0 && (
                            <div className="position-relative">
                                <Search size={18} className="position-absolute text-muted" style={{ top: "11px", left: "14px" }} />
                                <input
                                    type="text"
                                    className="form-control rounded-pill bg-light search-input ps-5 pe-4 py-2 text-dark"
                                    placeholder="Search by course or lesson..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{ width: "280px", fontSize: "14.5px", fontWeight: "500", color: "#000" }}
                                />
                            </div>
                        )}
                        {!navigator.onLine && (
                            <span className="badge bg-danger rounded-pill px-3 py-2 d-flex align-items-center gap-2 shadow-sm fw-bold">
                                <WifiOff size={14} /> Offline Mode
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="container py-4">

                {playingVideo && (
                    <div className="card border-0 shadow-lg rounded-4 overflow-hidden mb-5 bg-dark animate__animated animate__fadeIn">
                        <div className="p-3 px-4 d-flex justify-content-between align-items-center border-bottom border-secondary" style={{ background: '#1a1a1a' }}>
                            <div>
                                <span className="badge bg-theme-light text-theme border border-secondary mb-2 px-2 py-1">{playingVideo.courseTitle}</span>
                                <h4 className="m-0 fw-bold text-white d-flex align-items-center gap-2">
                                    <Film size={20} className="text-theme" /> {playingVideo.lessonTitle}
                                </h4>
                            </div>
                            <button className="btn btn-outline-light rounded-circle p-2" onClick={() => setPlayingVideo(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="bg-black text-center">
                            <video
                                ref={videoRef}
                                src={playingVideo.url}
                                className="w-100"
                                style={{ maxHeight: "70vh", objectFit: "contain" }}
                                controls
                                autoPlay
                                controlsList="nodownload"
                                // NAYA: Smart Tracker Event
                                onTimeUpdate={(e) => {
                                    const video = e.target;
                                    if (!video.duration) return;
                                    const progress = (video.currentTime / video.duration) * 100;

                                    if (progress >= 90 && !completedInSession.includes(playingVideo.lessonId)) {
                                        markVideoCompleted(playingVideo);
                                    }
                                }}
                            />
                        </div>
                    </div>
                )}

                {downloadedVideos.length === 0 ? (
                    <div className="text-center py-5 mt-5 animate__animated animate__fadeInUp">
                        <div className="bg-theme-light p-4 rounded-circle d-inline-block shadow-sm mb-4">
                            <Download size={56} className="text-theme" />
                        </div>
                        <h3 className="fw-bolder text-dark">No Offline Videos Yet</h3>
                        <p className="text-muted fs-6 mx-auto" style={{ maxWidth: '400px' }}>
                            Videos you download while connected to the internet will appear here for offline viewing.
                        </p>
                        <button className="btn btn-theme rounded-pill px-4 py-2 mt-2 fw-bold shadow-sm" onClick={() => navigate('/courses')}>
                            Explore Courses
                        </button>
                    </div>
                ) : Object.keys(groupedDownloads).length === 0 ? (
                    <div className="text-center py-5 mt-4 text-muted animate__animated animate__fadeIn">
                        <AlertCircle size={48} className="opacity-25 mb-3" />
                        <h4 className="fw-bold">No videos match your search</h4>
                        <p>Try using different keywords</p>
                    </div>
                ) : (
                    <div className="d-flex flex-column gap-5">
                        {Object.entries(groupedDownloads).map(([courseId, courseData]) => (
                            <div key={courseId} className="course-section animate__animated animate__fadeInUp">
                                <div className="d-flex align-items-center gap-3 mb-4 px-2">
                                    <div className="p-2 bg-theme-light rounded-3 text-theme shadow-sm">
                                        <Folder size={24} />
                                    </div>
                                    <h4 className="fw-bolder m-0 text-dark">{courseData.courseTitle}</h4>
                                    <span className="badge bg-white text-theme border rounded-pill shadow-sm px-3 py-1 fs-6">
                                        {courseData.lessons.length} Item{courseData.lessons.length > 1 ? 's' : ''}
                                    </span>
                                </div>

                                <div className="row g-4">
                                    {courseData.lessons.map((item) => (
                                        <div className="col-12 col-md-6 col-lg-4 col-xl-3" key={item.lessonId}>
                                            <div className="card video-card rounded-4 h-100 bg-white">
                                                <div
                                                    className="thumb-container bg-light d-flex justify-content-center align-items-center border-bottom"
                                                    style={{ height: "160px", cursor: "pointer", borderTopLeftRadius: '15px', borderTopRightRadius: '15px' }}
                                                    onClick={() => handlePlay(item)}
                                                >
                                                    <Film size={48} className="text-muted opacity-25" />
                                                    <div className="play-overlay">
                                                        <PlayCircle size={60} className="text-white play-icon-pulse" />
                                                    </div>
                                                    {(watchedLessons.includes(String(item.lessonId)) || completedInSession.includes(String(item.lessonId))) && (
                                                        <div className="position-absolute top-0 end-0 m-2" style={{ zIndex: 10 }}>
                                                            <span className="badge bg-success border border-white border-2 rounded-pill shadow-sm d-flex align-items-center gap-1 px-2 py-1">
                                                                <CheckCircle size={12} strokeWidth={3} /> Watched
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="position-absolute bottom-0 start-0 w-100 p-2 text-white" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)" }}>
                                                        <div className="d-flex justify-content-between align-items-center px-1">
                                                            <small className="fw-bold d-flex align-items-center gap-1">
                                                                <HardDrive size={12} /> {formatBytes(item.blob?.size || 0)}
                                                            </small>
                                                            <small className="badge bg-theme px-2 py-1 rounded-pill" style={{ fontSize: '10px' }}>MP4</small>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="card-body p-3 d-flex flex-column">
                                                    <h6 className="fw-bold mb-3 text-dark lh-base" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={item.lessonTitle}>
                                                        {item.lessonTitle}
                                                    </h6>
                                                    <div className="mt-auto d-flex gap-2">
                                                        <button
                                                            className="btn btn-theme flex-grow-1 rounded-pill fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2"
                                                            onClick={() => handlePlay(item)}
                                                        >
                                                            <Play size={16} fill="currentColor" /> Play
                                                        </button>
                                                        <button
                                                            className="btn btn-light text-danger rounded-pill px-3 shadow-sm border"
                                                            onClick={() => handleDelete(item.lessonId)}
                                                            title="Delete Offline Video"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}