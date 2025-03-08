import React from 'react';
import { ChatBot } from './ChatBot'; // Import the new ChatBot component

class LessonList extends React.Component {
    state = {
        selectedLesson: null
    };

    handleLessonClick = (lesson) => {
        console.log('Lesson clicked:', lesson); // Debugging log
        this.setState({ selectedLesson: lesson });
    };

    render() {
        return (
            <div className="lesson-list">
                {this.props.lessons.map(lesson => (
                    <div key={lesson.id} onClick={() => this.handleLessonClick(lesson)}>
                        {lesson.name}
                    </div>
                ))}
                {this.state.selectedLesson && (
                    <div style={{ height: '400px' }}>
                        <ChatBot topic={this.state.selectedLesson.name} />
                    </div>
                )}
            </div>
        );
    }
}

export default LessonList;
