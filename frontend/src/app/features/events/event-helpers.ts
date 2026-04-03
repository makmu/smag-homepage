import { Event } from '../../core/services/event.service';
import { EditableEvent } from '../../shared/event-modal/event-modal.component';

export function mapSignupType(type: Event['signupType']): 'none' | 'on_site' | 'special' {
    switch (type) {
        case 'none': return 'none';
        case 'open': return 'on_site';
        case 'instructions': return 'special';
        default: return 'none';
    }
}

export function eventToEditableEvent(event: Event): EditableEvent {
    return {
        id: event.id,
        title: event.title,
        teaser: event.description,
        location: event.location,
        date: event.date,
        description: event.fullDescription,
        signup_type: mapSignupType(event.signupType),
        signup_deadline: event.signupDeadline ?? null,
        signup_limit: event.signupLimit ?? null,
        signup_instructions: event.signupInstructions ?? null,
    };
}
