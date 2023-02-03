import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Select, { components } from 'react-select';
import makeAnimated from 'react-select/animated';
import moment from 'moment';
import Axios from 'axios';

import { apiServerIp, globalTags } from '../globalVariables';
import { createRecord, updateRecord, deleteRecord, handleStarClick } from "./trackingMethods";

import { AiFillPlayCircle, AiFillTags, AiFillPauseCircle, AiOutlineDelete, AiFillStar, AiOutlineStar } from 'react-icons/ai';

import './Tracking.css'
import { CustomPopup } from "../CustomPopup";

const animatedComponents = makeAnimated();

const DropdownIndicator = props => {
    return (
        <components.DropdownIndicator {...props}>
            <AiFillTags />
        </components.DropdownIndicator>
    );
};


const Tracking = () => {
    const [trackingHistory, setTrackingHistory] = useState([]);
    let quickIndex = 0;

    // set popup variables
    const [popupActive, setPopupActive] = useState(false);
    const [popupTitle, setPopupTitle] = useState("Warning");
    const [popupMessage, setPopupMessage] = useState("Something went wrong... Try again later!");

    // declare popup context
    // this is used to pass popup variables to other components
    const popupContext = {
        active: [popupActive, setPopupActive],
        title: [popupTitle, setPopupTitle],
        message: [popupMessage, setPopupMessage],
    };

    useEffect(() => {
        document.title = "Tracking | Void";

        const controller = new AbortController();
        Axios.get(apiServerIp + "/api/get/tracking/fetch",
            {
                params: {
                    user_id: 'self',
                    daysToSelect: 30
                },
                signal: controller.signal
            })
            .then(response => {
                if (response.data.status === 1) {
                    setTrackingHistory(response.data.data);
                }
            })
            .catch(error => {
                if (error.name === 'CanceledError') {
                    console.log('Aborted');
                }
                else {
                    console.log(error);
                }
            }
            );

        return () => controller.abort();
    }, []);

    return (
        <div className="tracking">
            {popupActive && <CustomPopup title={popupTitle} message={popupMessage} setActive={setPopupActive} />}
            <div className="header">
                <h2>Quick Access</h2>

                {trackingHistory.filter((record) => record.status === 1).length > 0 ? trackingHistory.filter((record) => record.status === 1).map((record) => {
                    if (quickIndex === 1) {
                        return null;
                    }

                    if (record.status === 1) {
                        let difference = moment.duration(moment(record.end_date).diff(moment(record.start_date)));
                        const hours = difference.hours() + (difference.days() * 24);
                        const minutes = difference.minutes();
                        const seconds = difference.seconds();

                        let formattedDifference = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                        quickIndex++;

                        return (
                            <Record key={record.id}
                                type="quick"
                                t_description={record.description}
                                t_tags={record.tags}
                                t_start_date={moment(record.start_date).format('YYYY-MM-DDTHH:mm')}
                                t_end_date={moment().format('YYYY-MM-DDTHH:mm')}
                                t_time_difference={formattedDifference}
                                t_record={record}
                                t_status={record.status}
                                popupContext={popupContext}
                            />
                        );
                    }
                }) : (
                    <Record type="quick" />
                )
                }
            </div>

            <div className="data-list">
                <h2>Last Month</h2>
                {
                    trackingHistory.map((record) => {
                        if (record.status !== 1) {
                            let difference = moment.duration(moment(record.end_date).diff(moment(record.start_date)));
                            const hours = difference.hours() + (difference.days() * 24);
                            const minutes = difference.minutes();
                            const seconds = difference.seconds();
                            let formattedDifference = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

                            return (
                                <Record
                                    key={record.id}
                                    type="history"
                                    t_description={record.description}
                                    t_tags={record.tags}
                                    t_start_date={moment(record.start_date).format('YYYY-MM-DDTHH:mm')}
                                    t_time_difference={formattedDifference}
                                    t_record={record}
                                    t_score={record.score || 0}
                                    popupContext={popupContext}
                                />
                            )
                        }
                    })
                }
            </div>
        </div>
    )
}

export const SelectStyles = {
    control: base => ({
        ...base,
        border: 0,
        // This line disable the blue border
        boxShadow: 'none',
        display: 'flex',
        justifyContent: 'right',
    }),
    option: (provided) => ({
        ...provided,
        backgroundColor: 'var(--divider-gray)',
        ':hover': {
            backgroundColor: 'var(--blue)',
            cursor: 'pointer',
        },
    }),
    multiValue: (provided) => ({
        ...provided,
        backgroundColor: 'var(--divider-gray)'
    }),
    multiValueLabel: (provided) => ({
        ...provided,
        color: 'white',
    }),
    multiValueRemove: (provided) => ({
        ...provided,
        color: 'white',
        cursor: 'pointer',
    }),
    dropdownIndicator: base => ({
        ...base,
        fontSize: '1.3rem',
        cursor: 'pointer',
        ':hover': {
            color: 'var(--blue)',
        }
    }),
    clearIndicator: base => ({
        ...base,
        display: 'none',
    }),
    indicatorSeparator: base => ({
        ...base,
        display: 'none',
    }),
};

export const Record = ({ type, t_description, t_tags, t_start_date, t_end_date, t_time_difference, t_status, t_record, t_score, popupContext, t_show_date = false }) => {
    const navigate = useNavigate();
    const [tagOptions, setTagOptions] = useState(globalTags);
    const [isTracking, setIsTracking] = useState(t_status);
    const [tracking_id, setTracking_id] = useState(t_record ? t_record.id : null);
    const [currentScore, setCurrentScore] = useState(t_score);
    const [selectedTags, setSelectedTags] = useState(t_tags ? t_tags.split(',') : []);

    const handleTimeChange = (time, label, action = "none") => {
        if ((time === null || time === undefined) || (time && (time.value === undefined || time.value == null))) {
            const startDateInput = document.querySelector('.quick input[type="datetime-local"]').value;
            time = { value: moment(startDateInput || t_start_date).format('YYYY-MM-DDTHH:mm') || moment().format('YYYY-MM-DDTHH:mm') };
        }

        if (label === null || label === undefined) {
            label = document.querySelector('.quick label.time');
        }

        let startTime = moment(time.value + ":" + (label.dataset.startedAtSeconds !== undefined ? (label.dataset.startedAtSeconds) : moment().format("ss"))).toDate();
        const currentTime = moment().toDate();
        let diff = currentTime - startTime;

        if (diff < 0) {
            startTime.setDate(moment().date());
            diff = currentTime - startTime;

            document.querySelector('.quick input[type="datetime-local"]').value = moment(t_start_date).format('YYYY-MM-DDTHH:mm');

            if (diff < 0) {
                time.value = moment().format('YYYY-MM-DDTHH:mm');
                label.innerText = "00:00:00";
                return;
            }
        }

        const hours = Math.floor(diff / 1000 / 60 / 60);
        const minutes = Math.floor(diff / 1000 / 60) - (hours * 60);
        const seconds = Math.floor(diff / 1000) - (hours * 60 * 60) - (minutes * 60);

        const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        label.innerText = formattedTime;

        if (action === "update" && !(type === 'quick' && !isTracking)) {
            updateRecord({
                start_date: startTime,
                end_date: document.querySelector('.quick input[type="datetime-local"]').value + ":" + moment().format('ss'),
            }, t_record, tracking_id, popupContext);
        }
    }

    useEffect(() => {
        if (type !== 'quick') return;

        const label = document.querySelector('.quick label.time');

        if (isTracking) {
            // set number of seconds in a minute
            label.style.opacity = '1';

            label.dataset.startedAtSeconds = (t_record && moment(t_record.start_date).format('ss')) || moment().format('ss');

            if (t_status !== 1) {
                createRecord(
                    document.querySelector('.quick input.descriptionInput').value,
                    document.querySelector('.quick input.startDate').value + ":" + label.dataset.startedAtSeconds,
                    selectedTags.map(tag => tag.value),
                    setTracking_id, popupContext
                );
                t_status = 1;
            }
        }
        else {
            label.style.opacity = '0.4';
        }

        const interval = setInterval(() => {
            if (isTracking) {
                handleTimeChange(null, label);
            }
        }, 1000);

        return () => clearInterval(interval);

    }, [type, isTracking, t_status, t_record]);

    useEffect(() => {
        if (type !== 'quick') return;
        document.querySelector('.quick input.startDate').value = moment(t_start_date).format('YYYY-MM-DD HH:mm');
    }, [navigate, type, t_start_date]);

    return (
        <div className={"box " + type}>

            {t_record && t_record.author && type !== "quick" && type.includes("record") && (
                <div className="author">
                    <img src={t_record.author.user_avatar_url} alt="avatar" />
                    <span>{t_record.author.user_name}</span>
                </div>
            )}

            <div className="description">
                <input className="descriptionInput" type="text" placeholder="Enter description" maxLength={255} onBlur={(event) => {
                    if (type === 'quick' && !isTracking) return;

                    const boxBase = event.target.closest(".box");

                    if (boxBase.querySelector('input.descriptionInput').value === t_description) return;

                    updateRecord({
                        description: boxBase.querySelector('input.descriptionInput').value
                    }, t_record, tracking_id, popupContext);
                }} defaultValue={t_description || ""} />
            </div>

            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '2rem',
            }}>

                <div className="tags">
                    <Select
                        id="tags-dropdown"
                        closeMenuOnSelect={false}
                        components={{ animatedComponents, DropdownIndicator }}
                        isMulti
                        options={tagOptions}
                        className="react-select-container"
                        classNamePrefix="react-select"
                        placeholder=""
                        onBlur={(e) => {
                            if (type === "quick" && !isTracking) return;

                            const tags = selectedTags.map(tag => tag.value);

                            if (JSON.stringify(tags) === t_tags) return;

                            updateRecord({
                                tags: tags,
                            }, t_record, tracking_id, popupContext);
                        }}
                        defaultValue={(t_tags && JSON.parse(t_tags).map((tag) => {
                            if (!tag) return;

                            return {
                                value: tag,
                                label: tag
                            }
                        })) || []}
                        onChange={(e) => {
                            setSelectedTags(e);
                        }}
                        styles={SelectStyles}
                    />

                </div>

                {type && !type.includes("quick") && (
                    <div className="score">
                        <input type="number" min="0" max="5" maxLength={1} defaultValue={t_score} onChange={(e) => {
                            if (e.target.value < 0 || e.target.value > 5) {
                                e.target.value = currentScore;
                            }
                        }} onBlur={(event) => {
                            const value = event.target.value;

                            if (value === currentScore) return;

                            setCurrentScore(value);
                            updateRecord({
                                score: value
                            }, t_record, tracking_id, popupContext);
                        }} />
                        <div className="star-icon" onClick={(event) => handleStarClick(event, setCurrentScore, t_record, tracking_id)}>
                            {currentScore.toString() === '0' ? <AiOutlineStar /> : <AiFillStar />}
                        </div>
                    </div>
                )}

                <div className="duration">

                    {type && type.includes("quick") &&
                        < input type="datetime-local" className="startDate" defaultValue={t_start_date} onChange={(event) => {
                            handleTimeChange(event.target, event.target.parentElement.querySelector('label'), "update");
                        }} />
                    }
                    {type && !type.includes("quick") && !t_show_date ?
                        <input className="time" type="text" placeholder="00:00:00" defaultValue={t_status ? "RUNNING" : t_time_difference} onBlur={(event) => {
                            // Check if the input is valid (HH:mm:ss) but hours can be up to 999
                            const regex = /^([0-9]{1,3}):([0-5][0-9]):([0-5][0-9])$/;
                            if (!regex.test(event.target.value)) {
                                event.target.value = t_time_difference;
                                return;
                            }

                            const endDate = moment(t_start_date + ":" + moment(t_record.start_date).format("ss")).add(event.target.value, 'seconds').format("YYYY-MM-DD HH:mm:ss");
                            // console.log(endDate)

                            if (endDate === moment(t_end_date).format("YYYY-MM-DD HH:mm:ss")) return;

                            updateRecord({
                                end_date: endDate,
                            }, t_record, tracking_id, popupContext);

                        }} />
                        : !t_show_date &&
                        <label className="time">{t_time_difference || "00:00:00"}</label>
                    }

                    {type && !type.includes("quick") && t_show_date && (
                        <div className="date-checked">
                            <span>Started: <input type="datetime-local" className="startDate" defaultValue={t_start_date} onChange={(event) => {
                                if (event.target.value === t_start_date) {
                                    return;
                                }

                                if (!moment(event.target.value).isValid()) {
                                    event.target.value = t_start_date;
                                    return;
                                }

                                if (moment(event.target.value).isAfter(moment(t_end_date))) {
                                    event.target.value = t_start_date;
                                    return;
                                }

                                updateRecord({
                                    start_date: event.target.value,
                                }, t_record, tracking_id, popupContext);
                            }} /></span>
                            <span>Ended: <input type="datetime-local" className="endDate" defaultValue={t_end_date} onChange={(event) => {
                                if (event.target.value === t_end_date) {
                                    return;
                                }

                                if (!moment(event.target.value).isValid()) {
                                    event.target.value = t_end_date;
                                    return;
                                }

                                if (moment(event.target.value).isBefore(moment(t_start_date))) {
                                    event.target.value = t_end_date;
                                    return;
                                }

                                updateRecord({
                                    end_date: event.target.value,
                                }, t_record, tracking_id, popupContext);
                            }} /></span>
                        </div>
                    )}

                    {type && !type.includes("quick") &&
                        <button className="deleteButton" onClick={(event) => {
                            event.preventDefault();
                            deleteRecord(t_record, popupContext)

                        }} >
                            <AiOutlineDelete />
                        </button>
                    }
                </div>

                {type && type.includes("quick") &&
                    <button className="startButton" onClick={(event) => {
                        event.preventDefault();

                        const boxBase = document.querySelector('.quick');

                        if (isTracking) {
                            updateRecord({
                                description: boxBase.querySelector('input.descriptionInput').value,
                                start_date: boxBase.querySelector('input.startDate').value + ":" + boxBase.querySelector('.quick label.time').dataset.startedAtSeconds,
                                end_date: moment().format('YYYY-MM-DDTHH:mm:ss'),
                                tags: selectedTags.map(tag => tag.value),
                                status: 0
                            }, t_record, tracking_id, popupContext, true);
                        }

                        setIsTracking(!isTracking);
                    }} >
                        {isTracking ? <AiFillPauseCircle /> : <AiFillPlayCircle />}
                    </button>}
            </div>
        </div >
    )
};

export default Tracking;