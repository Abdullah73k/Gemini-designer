"use client";

import { useCallback, useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import type { APIResponse, LayoutResponse } from "@/types/models";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";

const styleOptions = [
	{ label: "No preference", value: "" },
	{ label: "Cozy", value: "cozy" },
	{ label: "Minimal", value: "minimal" },
	{ label: "Modern", value: "modern" },
];

const randomId = () =>
	typeof crypto !== "undefined" && "randomUUID" in crypto
		? crypto.randomUUID()
		: Math.random().toString(36).slice(2, 9);

/**
 * Chat-driven control panel for authoring Gemini layout prompts.
 */
export default function ChatPanel() {
	const { messages, setMessages, input, handleInputChange, setInput } = useChat(
		{
			api: "/api/generate",
		}
	);
	const [style, setStyle] = useState<string>("cozy");
	const [temperature, setTemperature] = useState<number>(0.2);
	const [isPending, setIsPending] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [responseOpen, setResponseOpen] = useState(true);

	const latestAssistant = useMemo(
		() => [...messages].reverse().find((msg) => msg.role === "assistant"),
		[messages]
	);

	const handleSubmit = useCallback(
		async (event: React.FormEvent<HTMLFormElement>) => {
			event.preventDefault();
			const trimmed = input.trim();

			if (!trimmed) {
				setErrorMessage("Please describe the room you want to generate.");
				return;
			}

			setIsPending(true);
			setErrorMessage(null);
			setResponseOpen(true);

			const userMessage: Message = {
				id: randomId(),
				role: "user",
				content: trimmed,
			};
			setMessages((prev) => [...prev, userMessage]);

			const payload: Record<string, unknown> = {
				description: trimmed,
				temperature,
			};
			if (style) payload.style = style;

			try {
				const response = await fetch("/api/generate", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				});

				const json = (await response.json()) as APIResponse<LayoutResponse>;

				if (!response.ok || !json.ok || !json.data) {
					throw new Error(
						json.error ?? `Request failed with status ${response.status}`
					);
				}

				const assistantMessage: Message = {
					id: randomId(),
					role: "assistant",
					content: JSON.stringify(json.data, null, 2),
				};
				setMessages((prev) => [...prev, assistantMessage]);
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "Something went wrong while generating.";
				const assistantMessage: Message = {
					id: randomId(),
					role: "assistant",
					content: `Error: ${message}`,
				};
				setMessages((prev) => [...prev, assistantMessage]);
				setErrorMessage(message);
			} finally {
				setIsPending(false);
				setInput("");
			}
		},
		[input, style, temperature, setMessages, setInput]
	);

	return (
		<Card className="border-white/10 bg-white/5 text-slate-100 backdrop-blur-xl">
			<CardHeader>
				<CardTitle className="bg-gradient-to-r from-indigo-200 to-cyan-200 bg-clip-text text-transparent">
					Layout Assistant
				</CardTitle>
				<CardDescription className="text-slate-300">
					Describe your vision and let Gemini assemble a room layout. Adjust
					styling and sampling controls for creative freedom.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<form className="space-y-4" onSubmit={handleSubmit}>
					<div className="space-y-2">
						<Label htmlFor="description" className="text-slate-200">
							Room description
						</Label>
						<Textarea
							id="description"
							placeholder="Cozy gaming room with LED strips and dual monitors..."
							value={input}
							onChange={handleInputChange}
							disabled={isPending}
							className="min-h-[120px] resize-none border-white/10 bg-white/10 text-slate-100 placeholder:text-slate-400"
						/>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label className="text-slate-200">Style</Label>
							<Select
								onValueChange={(value) => setStyle(value)}
								value={style}
								disabled={isPending}
							>
								<SelectTrigger className="border-white/10 bg-white/10 text-slate-100">
									<SelectValue placeholder="Choose style" />
								</SelectTrigger>
								<SelectContent className="bg-slate-900 text-slate-100">
									{styleOptions.map((option) => (
										<SelectItem
											key={option.value || "none"}
											value={option.value}
										>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="temperature" className="text-slate-200">
								Temperature
							</Label>
							<Input
								id="temperature"
								type="number"
								min={0}
								max={1}
								step={0.1}
								value={temperature}
								onChange={(event) => {
									const next = Number(event.target.value);
									if (Number.isNaN(next)) {
										setTemperature(0);
										return;
									}
									setTemperature(Math.min(1, Math.max(0, next)));
								}}
								disabled={isPending}
								className="border-white/10 bg-white/10 text-slate-100"
							/>
						</div>
					</div>

					{errorMessage && (
						<p className="text-sm text-rose-300">Error: {errorMessage}</p>
					)}

					<Button
						type="submit"
						disabled={isPending}
						className="w-full bg-white/20 text-slate-900 hover:bg-white/40"
					>
						{/* TODO: Add lucide-react Send/Loader icons once the icon package is added. */}
						{isPending ? "Generating..." : "Generate Layout"}
					</Button>
				</form>

				<div className="space-y-3">
					<div className="space-y-2">
						<Label className="text-slate-200">Conversation</Label>
						<div className="max-h-48 space-y-3 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-3">
							{messages.length === 0 && (
								<p className="text-sm text-slate-400">
									No messages yet. Try a prompt!
								</p>
							)}

							{messages.map((message) => (
								<div
									key={message.id}
									className="rounded-lg bg-white/5 p-3 text-sm text-slate-100 shadow-inner"
								>
									<p className="mb-1 text-xs uppercase tracking-wide text-slate-400">
										{message.role}
									</p>
									<p className="whitespace-pre-wrap text-slate-100">
										{message.content}
									</p>
								</div>
							))}
						</div>
					</div>

					<Card className="border-white/10 bg-black/30 text-slate-100">
						<CardHeader className="flex flex-row items-center justify-between space-y-0">
							<CardTitle className="text-base">Response</CardTitle>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => setResponseOpen((value) => !value)}
								className="text-slate-200 hover:bg-white/10"
							>
								{responseOpen ? "Hide" : "Show"}
							</Button>
						</CardHeader>
						{responseOpen && (
							<CardContent>
								{/* TODO: Replace <pre> with react-syntax-highlighter once the dependency is available. */}
								<pre className="max-h-56 overflow-y-auto rounded-lg bg-black/50 p-4 text-xs text-emerald-200">
									{latestAssistant?.content ??
										"// Gemini JSON will appear here."}
								</pre>
							</CardContent>
						)}
					</Card>
				</div>
			</CardContent>
		</Card>
	);
}
