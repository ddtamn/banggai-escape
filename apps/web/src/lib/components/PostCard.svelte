<script lang="ts">
import { type Post, postImage } from '$lib/data/posts';

type Props = { post: Post };

let { post }: Props = $props();

const image = $derived(postImage(post));
</script>

<article
	class="flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-xs"
>
	<div>
		<a class="block h-44 overflow-hidden" href="/blog/{post.slug}">
			<img
				class="size-full object-cover transition-transform duration-300 hover:scale-105"
				src={image}
				alt={post.title}
				loading="lazy"
				width="900"
				height="600"
			/>
		</a>
		<div class="p-5">
			<div class="mb-2.5 flex flex-wrap items-center gap-2">
				<span class="chip">{post.category}</span>
				{#each post.tags.slice(0, 1) as tag (tag)}
					<span class="chip">{tag}</span>
				{/each}
			</div>
			<h3 class="mb-2 text-sm leading-snug font-bold text-stone-900">
				<a class="transition-colors hover:text-accent" href="/blog/{post.slug}">{post.title}</a>
			</h3>
			<p class="line-clamp-3 text-xs leading-relaxed text-stone-500">{post.excerpt}</p>
		</div>
	</div>

	<div class="px-5 pt-2 pb-5">
		<a class="btn-ghost" href="/blog/{post.slug}">
			<span>Read More</span>
			<i class="fa-solid fa-arrow-right text-[10px]"></i>
		</a>
	</div>
</article>
