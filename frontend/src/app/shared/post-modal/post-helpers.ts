import { Post } from '../../core/services/post.service';

export interface EditablePost {
    id: number;
    title: string;
    caption: string;
    date: string;
    thumbnailUrl: string;
}

export function postToEditablePost(post: Post): EditablePost {
    return {
        id: post.id,
        title: post.title,
        caption: post.caption,
        date: post.date,
        thumbnailUrl: post.thumbnailUrl,
    };
}